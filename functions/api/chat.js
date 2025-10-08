const DEFAULT_SYSTEM_PROMPT = [
    'You are the on-call HackTech cyber intelligence analyst embedded in a defensive operations team.',
    'Respond with precise, actionable insight rooted in cybersecurity best practices.',
    'Reference known frameworks (MITRE ATT&CK, NIST, CIS) when useful and keep answers under 220 words unless additional detail is requested.',
    'Use paragraphs or concise lists rather than markdown headings.',
].join(' ');

const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';
const DEFAULT_GATEWAY = 'demo-gateway';
// Intentionally non-functional placeholders so real credentials must be supplied via env vars.
const PLACEHOLDER_ACCOUNT_ID = 'demo-account-id';
const PLACEHOLDER_API_TOKEN = 'demo-api-token';
const TOKEN_ENV_FALLBACKS = [
    'CLOUDFLARE_AI_TOKEN',
    'AI_GATEWAY_API_KEY',
    'CLOUDFLARE_API_TOKEN',
    'WORKERS_AI_TOKEN',
];
const CORS_HEADERS = Object.freeze({
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
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

function resolveModelEndpoint(env, accountId) {
    const model = (env.CLOUDFLARE_AI_MODEL || '').trim() || DEFAULT_MODEL;
    const baseUrl = (env.CLOUDFLARE_AI_BASE_URL || '').trim();
    const gatewaySlug = (env.CLOUDFLARE_AI_GATEWAY || '').trim();

    if (!baseUrl) {
        const normalizedGateway = (gatewaySlug || DEFAULT_GATEWAY).replace(/^\/+|\/+$/g, '');
        const normalizedModel = model.replace(/^\/+/, '');
        return `https://gateway.ai.cloudflare.com/v1/${accountId}/${normalizedGateway}/workers-ai/${normalizedModel}`;
    }

function buildGoneResponse() {
    return new Response(JSON.stringify(RETIRED_PAYLOAD), {
        status: 410,
        headers: CORS_HEADERS,
    });
}

export async function onRequestPost(context) {
    const { request } = context;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { ...CORS_HEADERS, Allow: 'POST, OPTIONS' },
        });
    }

    // Always respond with a gone notice so clients know the integration has been removed.
    return buildGoneResponse();
}

export function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export const onRequest = onRequestPost;
