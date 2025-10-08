import { resolveAiEndpoint } from '../../lib/cloudflare-ai.js';

const DEFAULT_SYSTEM_PROMPT = [
    'You are the on-call HackTech cyber intelligence analyst embedded in a defensive operations team.',
    'Respond with precise, actionable insight rooted in cybersecurity best practices.',
    'Reference known frameworks (MITRE ATT&CK, NIST, CIS) when useful and keep answers under 220 words unless additional detail is requested.',
    'Use paragraphs or concise lists rather than markdown headings.',
].join(' ');
// Intentionally non-functional placeholders so real credentials must be supplied via env vars.
const DEFAULT_ACCOUNT_ID = 'demo-account-id';
const DEFAULT_API_TOKEN = 'demo-api-token';
const CORS_HEADERS = Object.freeze({
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
});

function sanitizeMessages(rawMessages) {
    const allowedRoles = new Set(['system', 'user', 'assistant']);
    const conversation = [];
    let systemPrompt = null;

    for (const message of rawMessages) {
        if (!message || typeof message !== 'object') {
            continue;
        }

        const role = typeof message.role === 'string' ? message.role.toLowerCase() : 'user';
        const content = typeof message.content === 'string' ? message.content.trim() : '';

        if (!content || !allowedRoles.has(role)) {
            continue;
        }

        if (role === 'system') {
            if (!systemPrompt) {
                systemPrompt = content;
            }
            continue;
        }

        conversation.push({ role, content });
    }

    while (conversation.length > 0 && conversation[0].role === 'assistant') {
        conversation.shift();
    }

    if (!conversation.some((entry) => entry.role === 'user')) {
        return { error: 'At least one user message is required.' };
    }

    return {
        systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        conversation: conversation.slice(-12),
    };
}

export async function onRequestPost(context) {
    const { env, request } = context;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { ...CORS_HEADERS, Allow: 'POST' },
        });
    }

    const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

    const accountId = normalize(env.CLOUDFLARE_ACCOUNT_ID) || DEFAULT_ACCOUNT_ID;
    const apiToken = normalize(env.CLOUDFLARE_AI_TOKEN) || DEFAULT_API_TOKEN;

    if (!accountId || !apiToken) {
        return new Response(JSON.stringify({ error: 'Cloudflare AI environment variables are not configured.' }), {
            status: 500,
            headers: CORS_HEADERS,
        });
    }

    let body;
    try {
        body = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
            status: 400,
            headers: CORS_HEADERS,
        });
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    if (rawMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'At least one message is required.' }), {
            status: 400,
            headers: CORS_HEADERS,
        });
    }

    const { systemPrompt, conversation, error: validationError } = sanitizeMessages(rawMessages);
    if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
            status: 400,
            headers: CORS_HEADERS,
        });
    }

    let endpoint;
    try {
        endpoint = resolveAiEndpoint(env, accountId);
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: CORS_HEADERS,
        });
    }

    const messages = [{ role: 'system', content: systemPrompt }, ...conversation];

    try {
        const aiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ messages }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`Cloudflare AI error: ${aiResponse.status} ${aiResponse.statusText} - ${errorText}`);
        }

        const result = await aiResponse.json();
        const candidates = [
            result?.result?.response,
            result?.result?.output_text,
            result?.result?.text,
            result?.result?.choices?.[0]?.message?.content,
            result?.result?.choices?.[0]?.text,
            result?.result?.data?.[0]?.text,
            result?.choices?.[0]?.message?.content,
            result?.choices?.[0]?.text,
            result?.data?.[0]?.text,
            result?.response,
            result?.output_text,
            result?.text,
            typeof result?.result === 'string' ? result.result : null,
            typeof result === 'string' ? result : null,
        ];

        const aiText = candidates.find((entry) => typeof entry === 'string' && entry.trim());

        if (!aiText) {
            throw new Error('Unexpected response from Cloudflare AI');
        }

        return new Response(JSON.stringify({ reply: aiText.trim(), createdAt: new Date().toISOString() }), {
            headers: CORS_HEADERS,
        });
    } catch (error) {
        console.error('Analyst chat function error:', error);

        const payload = {
            error: 'Unable to retrieve analyst response. Check Cloudflare logs for details.',
        };

        if (error instanceof Error && error.message) {
            payload.details = error.message;
        }

        return new Response(JSON.stringify(payload), {
            status: 500,
            headers: CORS_HEADERS,
        });
    }
}

export function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export const onRequest = onRequestPost;
