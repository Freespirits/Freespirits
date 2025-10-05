const DEFAULT_SYSTEM_PROMPT = [
    'You are the on-call HackTech cyber intelligence analyst embedded in a defensive operations team.',
    'Respond with precise, actionable insight rooted in cybersecurity best practices.',
    'Reference known frameworks (MITRE ATT&CK, NIST, CIS) when useful and keep answers under 220 words unless additional detail is requested.',
    'Use paragraphs or concise lists rather than markdown headings.',
].join(' ');

const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';

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

function resolveModelEndpoint(env, accountId) {
    const model = (env.CLOUDFLARE_AI_MODEL || '').trim() || DEFAULT_MODEL;
    const baseUrl = (env.CLOUDFLARE_AI_BASE_URL || '').trim();

    if (!baseUrl) {
        return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model.replace(/^\//, '')}`;
    }

    try {
        const parsed = new URL(baseUrl);
        if (!parsed.pathname.endsWith('/')) {
            parsed.pathname = `${parsed.pathname}/`;
        }
        return `${parsed.toString()}${model.replace(/^\//, '')}`;
    } catch (error) {
        throw new Error('CLOUDFLARE_AI_BASE_URL must be a valid absolute URL.');
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_AI_TOKEN;

    if (!accountId || !apiToken) {
        return new Response(
            JSON.stringify({ error: 'Cloudflare AI environment variables are not configured.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    if (rawMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'At least one message is required.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    const { systemPrompt, conversation, error: validationError } = sanitizeMessages(rawMessages);
    if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    let endpoint;
    try {
        endpoint = resolveModelEndpoint(env, accountId);
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
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
        const aiText =
            result?.result?.response ??
            result?.result?.output_text ??
            result?.result?.text ??
            result?.result ??
            null;

        if (!aiText || typeof aiText !== 'string') {
            throw new Error('Unexpected response from Cloudflare AI');
        }

        return new Response(
            JSON.stringify({ reply: aiText.trim(), createdAt: new Date().toISOString() }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Analyst chat function error:', error);
        return new Response(
            JSON.stringify({ error: 'Unable to retrieve analyst response. Check Cloudflare logs for details.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }
}
