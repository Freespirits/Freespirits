const SYSTEM_PROMPT = `You are Operative Lynx, an elite cyber threat analyst embedded with the HackTech collective. \
Reply in 1-3 concise sentences, combining tactical insight with actionable next steps. Keep the tone composed, professional, and supportive.`;

const ERROR_MESSAGE = 'Unable to reach the allied intelligence network right now.';
const MAX_HISTORY = 12;

const sanitizeHistory = (history) => {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .filter((entry) => entry && typeof entry.content === 'string' && typeof entry.role === 'string')
        .map((entry) => ({
            role: entry.role === 'assistant' ? 'assistant' : 'user',
            content: entry.content.trim(),
        }))
        .filter((entry) => entry.content.length > 0)
        .slice(-MAX_HISTORY);
};

export async function onRequestPost(context) {
    const { request, env } = context;

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

    const history = sanitizeHistory(body?.history);

    if (history.length === 0) {
        return new Response(JSON.stringify({ error: 'Conversation history is required.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

    try {
        const aiResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages }),
            }
        );

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`Cloudflare AI error: ${aiResponse.status} ${aiResponse.statusText} - ${errorText}`);
        }

        const result = await aiResponse.json();
        const reply =
            result?.result?.response ??
            result?.result?.output_text ??
            result?.result?.text ??
            result?.result ??
            null;

        if (!reply || typeof reply !== 'string') {
            throw new Error('Unexpected response from Cloudflare AI');
        }

        return new Response(
            JSON.stringify({ reply: reply.trim() }),
            { headers: { 'content-type': 'application/json' } }
        );
    } catch (error) {
        console.error('Active chat function error:', error);
        return new Response(
            JSON.stringify({ error: ERROR_MESSAGE }),
            { status: 502, headers: { 'content-type': 'application/json' } }
        );
    }
}
