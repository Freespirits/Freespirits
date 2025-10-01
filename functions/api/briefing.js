const SYSTEM_PROMPT =
    'You are a world-class cybersecurity intelligence analyst. Provide concise daily threat intel.';

const USER_PROMPT = `Summarize today's most significant cybersecurity developments. Include:\n\n1. One major, publicly disclosed data breach.\n2. One new or updated tool relevant to ethical hacking or defense.\n3. One significant update to a major security operating system like Kali Linux or Parrot OS.\n\nFormat the response with headings for "Recent Data Breaches", "New Tools & Exploits", and "Platform Updates".`;

export async function onRequestGet(context) {
    const { env, request, waitUntil } = context;
    const cache = caches.default;
    const cacheKey = new Request(request);

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
        return cachedResponse;
    }

    const providers = buildProviderConfigurations(env);
    if (providers.length === 0) {
        return new Response(
            JSON.stringify({ error: 'No AI providers are configured. Add Cloudflare or Vercel credentials.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }

    const basePayload = {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: USER_PROMPT },
        ],
    };

    for (const provider of providers) {
        try {
            const payload = provider.model ? { ...basePayload, model: provider.model } : basePayload;
            const aiText = await fetchProviderCompletion(provider, payload);

            if (!aiText || typeof aiText !== 'string') {
                throw new Error('Unexpected response payload shape');
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
            console.error(`Daily briefing provider error [${provider.name}]:`, error);
        }
    }

    return new Response(
        JSON.stringify({ error: 'Failed to retrieve intelligence briefing. Check server logs for details.' }),
        {
            status: 500,
            headers: { 'content-type': 'application/json' },
        }
    );
}

function buildProviderConfigurations(env) {
    const providers = [];

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_AI_TOKEN;

    if (accountId && apiToken) {
        providers.push({
            name: 'cloudflare-ai',
            url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
        });
    }

    const vercelUrl = env.VERCEL_AI_GATEWAY_URL ?? env.VERCEL_GATEWAY_URL;
    const vercelToken = env.VERCEL_AI_GATEWAY_TOKEN ?? env.VERCEL_GATEWAY_TOKEN ?? env.VERCEL_GATEWAY_API_KEY;
    const vercelModel = env.VERCEL_AI_MODEL ?? env.VERCEL_MODEL;

    if (vercelUrl && vercelToken) {
        providers.push({
            name: 'vercel-ai-gateway',
            url: vercelUrl,
            headers: {
                Authorization: `Bearer ${vercelToken}`,
            },
            model: vercelModel,
        });
    }

    return providers;
}

async function fetchProviderCompletion(provider, payload) {
    const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...provider.headers,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await safeReadBody(response);
        throw new Error(`Provider responded with ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    return extractTextFromResult(result);
}

async function safeReadBody(response) {
    try {
        return await response.text();
    } catch (error) {
        console.warn('Failed to read provider error body:', error);
        return '';
    }
}

function extractTextFromResult(result) {
    if (!result || typeof result !== 'object') {
        return null;
    }

    const cloudflareText =
        result?.result?.response ??
        result?.result?.output_text ??
        result?.result?.text ??
        result?.result;

    if (typeof cloudflareText === 'string') {
        return cloudflareText;
    }

    if (Array.isArray(result?.choices) && result.choices.length > 0) {
        const firstChoice = result.choices[0];
        const messageContent = firstChoice?.message?.content;

        if (typeof messageContent === 'string') {
            return messageContent;
        }

        if (Array.isArray(messageContent)) {
            return messageContent
                .map((part) => {
                    if (!part) return '';
                    if (typeof part === 'string') return part;
                    if (typeof part.text === 'string') return part.text;
                    if (typeof part.content === 'string') return part.content;
                    return '';
                })
                .join('');
        }

        if (typeof firstChoice?.text === 'string') {
            return firstChoice.text;
        }
    }

    if (typeof result?.output_text === 'string') {
        return result.output_text;
    }

    if (typeof result?.response === 'string') {
        return result.response;
    }

    return null;
}
