const ALLOWED_PROXY_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

const CORS_HEADERS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'vary': 'origin',
};

function applyCorsHeaders(headers = new Headers()) {
    const result = new Headers(headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        if (key.toLowerCase() === 'vary') {
            const existing = result.get('vary');
            const varyValues = new Set();
            if (existing) {
                existing
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean)
                    .forEach((entry) => varyValues.add(entry));
            }

            value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .forEach((entry) => varyValues.add(entry));

            result.set('vary', Array.from(varyValues).join(', ') || value);
            continue;
        }

        result.set(key, value);
    }
    return result;
}

function createJsonResponse(payload, { status = 200, headers } = {}) {
    const responseHeaders = applyCorsHeaders(headers);
    responseHeaders.set('content-type', 'application/json');
    return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

function normalisePathSegments(pathSegments) {
    if (!pathSegments) {
        return '';
    }

    if (Array.isArray(pathSegments)) {
        return pathSegments.filter((segment) => typeof segment === 'string' && segment.length > 0).join('/');
    }

    return typeof pathSegments === 'string' ? pathSegments.replace(/^\//, '') : '';
}

function validateAndResolveBaseUrl(rawUrl) {
    if (!rawUrl) {
        return { error: 'MIDJOURNEY_PROXY_URL environment variable is not configured.' };
    }

    try {
        const url = new URL(rawUrl);
        if (!url.pathname.endsWith('/')) {
            url.pathname = `${url.pathname}/`;
        }
        return { url };
    } catch (error) {
        return { error: 'MIDJOURNEY_PROXY_URL must be a valid absolute URL.' };
    }
}

function createTimestamp() {
    return new Date().toISOString();
}

export async function proxyToMidjourney(context, pathSegments) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: applyCorsHeaders() });
    }

    if (!ALLOWED_PROXY_METHODS.includes(request.method)) {
        return createJsonResponse(
            { error: `Unsupported method: ${request.method}.` },
            { status: 405, headers: new Headers({ Allow: ALLOWED_PROXY_METHODS.join(', ') }) }
        );
    }

    const { url: baseUrl, error } = validateAndResolveBaseUrl(env.MIDJOURNEY_PROXY_URL);
    if (error) {
        return createJsonResponse({ error }, { status: 500 });
    }

    const suffix = normalisePathSegments(pathSegments);
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(suffix, baseUrl);
    if (baseUrl.search) {
        targetUrl.search = baseUrl.search;
    }

    if (incomingUrl.search) {
        const mergedSearch = new URLSearchParams(targetUrl.search);
        const incomingSearch = new URLSearchParams(incomingUrl.search);

        const uniqueIncomingKeys = new Set();
        for (const key of incomingSearch.keys()) {
            if (!uniqueIncomingKeys.has(key)) {
                mergedSearch.delete(key);
                uniqueIncomingKeys.add(key);
            }
        }

        for (const [key, value] of incomingSearch.entries()) {
            mergedSearch.append(key, value);
        }

        const merged = mergedSearch.toString();
        targetUrl.search = merged ? `?${merged}` : '';
    }

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');
    headers.set('origin', baseUrl.origin);

    let body;
    if (!['GET', 'HEAD'].includes(request.method)) {
        const buffer = await request.arrayBuffer();
        body = buffer.byteLength > 0 ? buffer : null;
    }

    try {
        const upstreamResponse = await fetch(targetUrl.toString(), {
            method: request.method,
            headers,
            body: body ?? undefined,
        });

        const responseHeaders = applyCorsHeaders(upstreamResponse.headers);
        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: responseHeaders,
        });
    } catch (err) {
        console.error('Midjourney proxy request failed:', err);
        return createJsonResponse(
            { error: 'Failed to reach the configured Midjourney proxy.' },
            { status: 502 }
        );
    }
}

export async function midjourneyStatus(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: applyCorsHeaders() });
    }

    if (request.method !== 'GET') {
        return createJsonResponse(
            { error: 'Method not allowed. Use GET for status checks.' },
            { status: 405, headers: new Headers({ Allow: 'GET, OPTIONS' }) }
        );
    }

    const { url: baseUrl, error } = validateAndResolveBaseUrl(env.MIDJOURNEY_PROXY_URL);
    if (error) {
        return createJsonResponse({ ok: false, error, checkedAt: createTimestamp() }, { status: 500 });
    }

    const statusUrl = new URL('mj', baseUrl);
    const startedAt = Date.now();

    try {
        const upstreamResponse = await fetch(statusUrl.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        const summary = {
            ok: upstreamResponse.ok,
            upstreamStatus: upstreamResponse.status,
            responseTimeMs: Date.now() - startedAt,
            checkedAt: createTimestamp(),
        };

        if (upstreamResponse.ok) {
            try {
                summary.upstream = await upstreamResponse.clone().json();
            } catch {
                const message = (await upstreamResponse.text()).trim();
                if (message) {
                    summary.message = message.slice(0, 5000);
                }
            }

            if (!summary.message) {
                summary.message = 'Midjourney proxy responded successfully.';
            }
        } else {
            const errorText = (await upstreamResponse.text()).trim();
            if (errorText) {
                summary.error = errorText.slice(0, 5000);
            }
        }

        return createJsonResponse(summary, { status: upstreamResponse.ok ? 200 : 502 });
    } catch (err) {
        console.error('Midjourney status check failed:', err);
        return createJsonResponse(
            {
                ok: false,
                error: 'Unable to contact the Midjourney proxy for status.',
                checkedAt: createTimestamp(),
            },
            { status: 502 }
        );
    }
}
