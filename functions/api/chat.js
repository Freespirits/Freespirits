const CORS_HEADERS = Object.freeze({
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
});

export async function onRequestPost(context) {
    const { request } = context;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { ...CORS_HEADERS, Allow: 'POST' },
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

    const hasUserMessage = rawMessages.some(
        (message) => message && typeof message === 'object' && message.role === 'user' && typeof message.content === 'string'
    );

    if (!hasUserMessage) {
        return new Response(JSON.stringify({ error: 'At least one user message is required.' }), {
            status: 400,
            headers: CORS_HEADERS,
        });
    }

    const archivedReply =
        'The live analyst chat is offline while Cloudflare Workers AI access is retired. Review the archived briefings for intel and check back soon.';

    return new Response(
        JSON.stringify({
            reply: archivedReply,
            createdAt: new Date().toISOString(),
            notice: 'Workers AI integration removed — responses are now static.',
        }),
        {
            headers: CORS_HEADERS,
        }
    );
}

export function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export const onRequest = onRequestPost;
