const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json' });

const RETIRED_PAYLOAD = Object.freeze({
    error: 'The daily briefing feed has been retired.',
    notice: 'Cloudflare Workers AI integrations have been removed from this project.',
});

function buildGoneResponse() {
    return new Response(JSON.stringify(RETIRED_PAYLOAD), {
        status: 410,
        headers: JSON_HEADERS,
    });
}

export async function onRequestGet() {
    return buildGoneResponse();
}

export const onRequest = onRequestGet;
