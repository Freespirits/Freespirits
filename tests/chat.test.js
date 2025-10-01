import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../functions/api/chat.js';

const originalFetch = globalThis.fetch;

beforeEach(() => {
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                result: {
                    response: 'Sample analyst insight',
                },
            }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
});

after(() => {
    globalThis.fetch = originalFetch;
});

test('onRequestPost forwards chat history and returns analyst reply', async () => {
    const requests = [];
    globalThis.fetch = async (input, init) => {
        requests.push({ input, init });
        return new Response(
            JSON.stringify({
                result: {
                    response: 'Actionable response',
                },
            }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
    };

    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            messages: [
                { role: 'user', content: 'Need mitigation advice.' },
                { role: 'assistant', content: 'Previous answer.' },
            ],
        }),
    });

    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request,
    });

    assert.equal(response.status, 200);
    const payload = await response.clone().json();
    assert.equal(payload.reply, 'Actionable response');

    assert.equal(requests.length, 1);
    const forwarded = JSON.parse(requests[0].init.body);
    assert.equal(forwarded.messages[0].role, 'system');
    assert.equal(forwarded.messages[1].role, 'user');
    assert.equal(forwarded.messages[2].role, 'assistant');
});

test('onRequestPost rejects invalid payloads', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notMessages: true }),
    });

    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request,
    });

    assert.equal(response.status, 400);
    const payload = await response.clone().json();
    assert.match(payload.error, /message/i);
});

test('onRequestPost can read credentials from process.env as a fallback', async () => {
    const originalAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    const originalToken = process.env.CLOUDFLARE_AI_TOKEN;

    process.env.CLOUDFLARE_ACCOUNT_ID = 'process-account';
    process.env.CLOUDFLARE_AI_TOKEN = 'process-token';

    try {
        const request = new Request('https://example.com/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Testing fallback credentials.' }],
            }),
        });

        const response = await onRequestPost({ env: {}, request });

        assert.equal(response.status, 200);
        const payload = await response.clone().json();
        assert.equal(payload.reply, 'Sample analyst insight');
    } finally {
        if (originalAccount === undefined) {
            delete process.env.CLOUDFLARE_ACCOUNT_ID;
        } else {
            process.env.CLOUDFLARE_ACCOUNT_ID = originalAccount;
        }

        if (originalToken === undefined) {
            delete process.env.CLOUDFLARE_AI_TOKEN;
        } else {
            process.env.CLOUDFLARE_AI_TOKEN = originalToken;
        }
    }
});

test('onRequestPost fails when credentials are missing', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] }),
    });

    const response = await onRequestPost({ env: {}, request });

    assert.equal(response.status, 500);
    const payload = await response.clone().json();
    assert.match(payload.error, /not configured/i);
});

test('onRequestPost rejects unsupported methods', async () => {
    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request: new Request('https://example.com/api/chat', { method: 'GET' }),
    });

    assert.equal(response.status, 405);
});
