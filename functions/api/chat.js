const RETIRED_PAYLOAD = Object.freeze({
    error: 'The HackTech analyst chat console has been retired.',
    notice: 'Cloudflare Workers AI integrations have been removed from this project.',
});

const CORS_HEADERS = Object.freeze({
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
});

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
            headers: { ...CORS_HEADERS, allow: 'POST, OPTIONS' },
        });
    }

    return buildGoneResponse();
}

export function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export const onRequest = onRequestPost;
