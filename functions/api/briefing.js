const DEFAULT_PROVIDER = 'cloudflare';

const PROVIDER_HANDLERS = {
    cloudflare: fetchFromCloudflare,
    huggingface: fetchFromHuggingFace,
};

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const provider = (url.searchParams.get('provider') ?? DEFAULT_PROVIDER).toLowerCase();
    const strategy = PROVIDER_HANDLERS[provider];

    if (!strategy) {
        return new Response(
            JSON.stringify({ error: `Unsupported AI provider requested: ${provider}` }),
            {
                status: 400,
                headers: { 'content-type': 'application/json' },
            }
        );
    }

    const { systemPrompt, userPrompt } = buildPrompts();

    try {
        const aiText = await strategy({ env, systemPrompt, userPrompt });

        if (!aiText || typeof aiText !== 'string') {
            throw new Error('Provider returned an empty response.');
        }

        return new Response(
            JSON.stringify({ markdown: aiText.trim(), provider }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
    } catch (error) {
        console.error(`Daily briefing function error for provider "${provider}":`, error);
        return new Response(
            JSON.stringify({ error: 'Failed to retrieve intelligence briefing. Check server logs for details.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }
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
        throw new Error('Cloudflare AI environment variables are not configured.');
    }

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
        throw new Error(`Cloudflare AI error: ${aiResponse.status} ${aiResponse.statusText} - ${errorText}`);
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
        throw new Error('Hugging Face API token is not configured.');
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
        throw new Error(`Hugging Face error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (result?.error) {
        throw new Error(`Hugging Face returned an error: ${result.error}`);
    }

    let aiText = null;

    if (Array.isArray(result)) {
        aiText = result[0]?.generated_text ?? result[0]?.text ?? null;
    } else if (typeof result === 'object' && result !== null) {
        aiText = result.generated_text ?? result.data?.[0]?.generated_text ?? null;
    }

    if (!aiText || typeof aiText !== 'string') {
        throw new Error('Unexpected response from Hugging Face Inference API');
    }

    return aiText.trim();
}
