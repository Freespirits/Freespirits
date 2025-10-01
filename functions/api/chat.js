function readConfig(env, key, fallback = undefined) {
    if (typeof env?.[key] === 'string' && env[key]) {
        return env[key];
    }

    if (typeof process !== 'undefined' && process?.env?.[key]) {
        return process.env[key];
    }

    return fallback;
}

export async function onRequestPost(context) {
    const { env, request } = context;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    const accountId = readConfig(env, 'CLOUDFLARE_ACCOUNT_ID', env?.ACCOUNT_ID);
    const apiToken = readConfig(env, 'CLOUDFLARE_AI_TOKEN', env?.CLOUDFLARE_API_TOKEN);

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

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    if (rawMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'At least one message is required.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    const allowedRoles = new Set(['user', 'assistant']);
    const chatHistory = [];

    for (const message of rawMessages) {
        if (!message || typeof message !== 'object') {
            continue;
        }

        const role = typeof message.role === 'string' ? message.role.toLowerCase() : 'user';
        const content = typeof message.content === 'string' ? message.content.trim() : '';

        if (!content) {
            continue;
        }

        if (allowedRoles.has(role)) {
            chatHistory.push({ role, content });
        }
    }

    if (chatHistory.length === 0) {
        return new Response(JSON.stringify({ error: 'No valid chat messages provided.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    const systemPrompt = [
        'You are the on-call HackTech cyber intelligence analyst embedded in a defensive operations team.',
        'Respond with precise, actionable insight rooted in cybersecurity best practices.',
        'Reference known frameworks (MITRE ATT&CK, NIST, CIS) when useful and keep answers under 220 words unless additional detail is requested.',
        'Use paragraphs or concise lists rather than markdown headings.',
    ].join(' ');

    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-12),
    ];

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
        const aiText =
            result?.result?.response ??
            result?.result?.output_text ??
            result?.result?.text ??
            result?.result ??
            null;

        if (!aiText || typeof aiText !== 'string') {
            throw new Error('Unexpected response from Cloudflare AI');
        }

        return new Response(
            JSON.stringify({ reply: aiText.trim(), createdAt: new Date().toISOString() }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Analyst chat function error:', error);
        return new Response(
            JSON.stringify({ error: 'Unable to retrieve analyst response.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }
}
