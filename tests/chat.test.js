import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../functions/api/chat.js';

const originalFetch = globalThis.fetch;

beforeEach(() => {
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                result: {
                    response: 'Acknowledged. Holding the line.',
                },
            }),
            { headers: { 'content-type': 'application/json' } }
        );
});

after(() => {
    globalThis.fetch = originalFetch;
});

test('onRequestPost forwards conversation history to Cloudflare AI', async () => {
    const fetchCalls = [];

    globalThis.fetch = async (...args) => {
        fetchCalls.push(args);
        return new Response(
            JSON.stringify({
                result: {
                    response: 'Intel received. Issuing countermeasure advice.',
                },
            }),
            { headers: { 'content-type': 'application/json' } }
        );
    };

    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            history: [
                { role: 'assistant', content: 'Operative Lynx ready.' },
                { role: 'user', content: '  Need insight on phishing surge  ' },
            ],
        }),
    });

    const response = await onRequestPost({
        env: {
            CLOUDFLARE_ACCOUNT_ID: 'acct',
            CLOUDFLARE_AI_TOKEN: 'token',
        },
        request,
    });

    assert.equal(response.status, 200);
    const payload = await response.clone().json();
    assert.equal(payload.reply, 'Intel received. Issuing countermeasure advice.');

    assert.equal(fetchCalls.length, 1, 'Cloudflare AI should be called once');
    const [, options] = fetchCalls[0];
    assert.equal(options.method, 'POST');
    const parsedBody = JSON.parse(options.body);
    assert.equal(parsedBody.messages[0].role, 'system');
    assert.match(parsedBody.messages[0].content, /Operative Lynx/);
    assert.deepEqual(parsedBody.messages.slice(1), [
        { role: 'assistant', content: 'Operative Lynx ready.' },
        { role: 'user', content: 'Need insight on phishing surge' },
    ]);
});

test('onRequestPost fails when AI credentials are missing', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        body: JSON.stringify({
            history: [{ role: 'assistant', content: 'hello' }],
        }),
    });

    const response = await onRequestPost({
        env: {},
        request,
    });

    assert.equal(response.status, 500);
    const payload = await response.clone().json();
    assert.match(payload.error, /not configured/i);
});

test('onRequestPost rejects empty conversation history', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        body: JSON.stringify({ history: [] }),
    });

    const response = await onRequestPost({
        env: {
            CLOUDFLARE_ACCOUNT_ID: 'acct',
            CLOUDFLARE_AI_TOKEN: 'token',
        },
        request,
    });

    assert.equal(response.status, 400);
    const payload = await response.clone().json();
    assert.match(payload.error, /history is required/i);
});
