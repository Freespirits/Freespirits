const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';
const DEFAULT_GATEWAY_ID = 'vck_2v6dyFw9v3TbdmuMDXuJnPD2QWD4M5bRQV5iFQm8nU3aDKW7iT2NAZuo';

function resolveBriefingEndpoint(env, accountId) {
    const model = (env.CLOUDFLARE_AI_MODEL || '').trim() || DEFAULT_MODEL;
    const baseUrl = (env.CLOUDFLARE_AI_BASE_URL || '').trim();

    if (!baseUrl) {
        const gatewayId = (env.CLOUDFLARE_AI_GATEWAY_ID || '').trim() || DEFAULT_GATEWAY_ID;
        return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/${model.replace(/^\//, '')}`;
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

export async function onRequestGet(context) {
    const { env, request, waitUntil } = context;
    const cache = caches.default;
    const cacheKey = new Request(request);

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
        return cachedResponse;
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

    const systemPrompt = 'You are a world-class cybersecurity intelligence analyst. Provide concise daily threat intel.';
    const userPrompt = `Summarize today\'s most significant cybersecurity developments. Include:\n\n1. One major, publicly disclosed data breach.\n2. One new or updated tool relevant to ethical hacking or defense.\n3. One significant update to a major security operating system like Kali Linux or Parrot OS.\n\nFormat the response with headings for "Recent Data Breaches", "New Tools & Exploits", and "Platform Updates".`;

    try {
        let endpoint;
        try {
            endpoint = resolveBriefingEndpoint(env, accountId);
        } catch (error) {
            return new Response(
                JSON.stringify({ error: error.message }),
                {
                    status: 500,
                    headers: { 'content-type': 'application/json' },
                }
            );
        }

        const aiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
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

        const responseBody = JSON.stringify({
            markdown: aiText,
            generatedAt: new Date().toISOString(),
        });

        const response = new Response(responseBody, {
            headers: {
                'content-type': 'application/json',
                'cache-control': 'public, max-age=0, s-maxage=7200',
            },
        });

        if (typeof waitUntil === 'function') {
            waitUntil(cache.put(cacheKey, response.clone()));
        } else {
            await cache.put(cacheKey, response.clone());
        }

        return response;
    } catch (error) {
        console.error('Daily briefing function error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to retrieve intelligence briefing. Check server logs for details.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }
}
