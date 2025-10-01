const DEFAULT_PROVIDER = 'cloudflare';

const PROVIDER_HANDLERS = {
    cloudflare: fetchFromCloudflare,
    huggingface: fetchFromHuggingFace,
};

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const requestedProvider = url.searchParams.get('provider');
    const providerKey = (requestedProvider ?? DEFAULT_PROVIDER).toLowerCase();
    const fallbackHint = url.searchParams.get('fallback');

    if (requestedProvider && !PROVIDER_HANDLERS[providerKey]) {
        return jsonResponse(
            { error: `Unsupported AI provider requested: ${providerKey}` },
            400
        );
    }

    const { systemPrompt, userPrompt } = buildPrompts();
    const allowFallback = shouldAllowFallback({ requestedProvider, fallbackHint });
    const providerOrder = buildProviderOrder(providerKey, { env, allowFallback, explicit: Boolean(requestedProvider) });

    if (!providerOrder.length) {
        return jsonResponse(
            {
                error: 'No AI providers are configured. Add at least one provider token to continue.',
                attemptedProviders: [],
            },
            500
        );
    }

    const providerErrors = [];

    for (const provider of providerOrder) {
        const strategy = PROVIDER_HANDLERS[provider];
        if (!strategy) {
            continue;
        }

        try {
            const aiText = await strategy({ env, systemPrompt, userPrompt });

            if (!aiText || typeof aiText !== 'string') {
                throw new ProviderError('Provider returned an empty response.', { status: 502 });
            }

            return jsonResponse({
                markdown: aiText.trim(),
                provider,
                attemptedProviders: providerOrder,
            });
        } catch (error) {
            const normalized = normalizeProviderError(provider, error);
            providerErrors.push(normalized);
            console.error(`Daily briefing function error for provider "${provider}":`, error);
        }
    }

    const lastError = providerErrors[providerErrors.length - 1];
    const status = lastError?.status ?? 500;
    const errorMessage = requestedProvider
        ? `Failed to retrieve intelligence briefing from ${providerKey}.`
        : 'Failed to retrieve intelligence briefing from all configured providers.';

    return jsonResponse(
        {
            error: errorMessage,
            attemptedProviders: providerOrder,
            providerErrors,
        },
        status
    );
}

function buildPrompts() {
    const systemPrompt = 'You are a world-class cybersecurity intelligence analyst. Provide concise daily threat intel.';
    const userPrompt = `Summarize today\'s most significant cybersecurity developments. Include:\n\n1. One major, publicly disclosed data breach.\n2. One new or updated tool relevant to ethical hacking or defense.\n3. One significant update to a major security operating system like Kali Linux or Parrot OS.\n\nFormat the response with headings for "Recent Data Breaches", "New Tools & Exploits", and "Platform Updates".`;

    return { systemPrompt, userPrompt };
}

async function fetchFromCloudflare({ env, systemPrompt, userPrompt }) {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_AI_TOKEN;

    if (!accountId || !apiToken) {
        throw new ProviderError('Cloudflare AI environment variables are not configured.', { status: 400 });
    }

    await ensureNodeIPv4Preference();

    const aiResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
        }
    );

    if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new ProviderError(
            `Cloudflare AI error: ${aiResponse.status} ${aiResponse.statusText} - ${truncate(errorText, 280)}`,
            { status: aiResponse.status || 502 }
        );
    }

    const result = await aiResponse.json();
    return (
        result?.result?.response ??
        result?.result?.output_text ??
        result?.result?.text ??
        result?.result ??
        null
    );
}

async function fetchFromHuggingFace({ env, systemPrompt, userPrompt }) {
    const apiToken = env.HUGGINGFACE_API_TOKEN;
    const apiUrl = env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';

    if (!apiToken) {
        throw new ProviderError('Hugging Face API token is not configured.', { status: 400 });
    }

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                max_new_tokens: 600,
                temperature: 0.7,
                return_full_text: false,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
            `Hugging Face error: ${response.status} ${response.statusText} - ${truncate(errorText, 280)}`,
            { status: response.status || 502 }
        );
    }

    const result = await response.json();

    if (result?.error) {
        throw new ProviderError(`Hugging Face returned an error: ${result.error}`);
    }

    let aiText = null;

    if (Array.isArray(result)) {
        aiText = result[0]?.generated_text ?? result[0]?.text ?? null;
    } else if (typeof result === 'object' && result !== null) {
        aiText = result.generated_text ?? result.data?.[0]?.generated_text ?? null;
    }

    if (!aiText || typeof aiText !== 'string') {
        throw new ProviderError('Unexpected response from Hugging Face Inference API');
    }

    return aiText.trim();
}

function buildProviderOrder(primaryProvider, { env, allowFallback, explicit }) {
    const availableProviders = getAvailableProviders(env);
    let providerKey = primaryProvider;

    if (!explicit && allowFallback && !availableProviders.includes(primaryProvider) && availableProviders.length) {
        providerKey = availableProviders[0];
    }

    const order = [];

    if (PROVIDER_HANDLERS[providerKey]) {
        if (explicit || availableProviders.includes(providerKey) || !availableProviders.length) {
            order.push(providerKey);
        }
    }

    if (allowFallback) {
        for (const provider of availableProviders) {
            if (!order.includes(provider)) {
                order.push(provider);
            }
        }
    }

    if (!order.length && explicit && PROVIDER_HANDLERS[providerKey]) {
        order.push(providerKey);
    }

    return order;
}

function getAvailableProviders(env) {
    return Object.keys(PROVIDER_HANDLERS).filter((provider) => isProviderConfigured(provider, env));
}

function isProviderConfigured(provider, env) {
    switch (provider) {
        case 'cloudflare':
            return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN);
        case 'huggingface':
            return Boolean(env.HUGGINGFACE_API_TOKEN);
        default:
            return false;
    }
}

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function shouldAllowFallback({ requestedProvider, fallbackHint }) {
    if (!requestedProvider) {
        return true;
    }

    if (!fallbackHint) {
        return false;
    }

    const normalized = fallbackHint.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

class ProviderError extends Error {
    constructor(message, { status = 500 } = {}) {
        super(message);
        this.name = 'ProviderError';
        this.status = status;
    }
}

function normalizeProviderError(provider, error) {
    if (error instanceof ProviderError) {
        return {
            provider,
            message: truncate(error.message, 300),
            status: error.status,
        };
    }

    const status = typeof error?.status === 'number' ? error.status : 500;
    const message = typeof error?.message === 'string' ? truncate(error.message, 300) : 'Unknown provider error';

    return { provider, message, status };
}

function truncate(value, maxLength) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

let configuredIPv4Preference = false;

async function ensureNodeIPv4Preference() {
    if (configuredIPv4Preference) {
        return;
    }

    configuredIPv4Preference = true;

    if (typeof process === 'undefined' || process.release?.name !== 'node') {
        return;
    }

    try {
        const dns = await import('node:dns');
        if (typeof dns.setDefaultResultOrder === 'function') {
            dns.setDefaultResultOrder('ipv4first');
        }
    } catch (error) {
        console.warn('Unable to adjust DNS resolution order for Node environment:', error);
    }
}
