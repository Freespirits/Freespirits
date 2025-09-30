export async function onRequestGet(context) {
    const { env } = context;
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
        const aiResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
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
            }
        );

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

        return new Response(JSON.stringify({ markdown: aiText }), {
            headers: { 'content-type': 'application/json' },
        });
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
