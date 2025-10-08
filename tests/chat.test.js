import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../functions/api/chat.js';
import { DEFAULT_GATEWAY_ID, DEFAULT_MODEL } from '../lib/cloudflare-ai.js';

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
    const normalizedModel = DEFAULT_MODEL.replace(/^\/+/, '');
    assert.equal(
        requests[0].input,
        `https://gateway.ai.cloudflare.com/v1/acct/${DEFAULT_GATEWAY_ID}/${normalizedModel}`
    );
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

test('onRequestPost surfaces upstream AI error details', async () => {
    globalThis.fetch = async () =>
        new Response(JSON.stringify({ errors: [{ message: 'Invalid token' }] }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'content-type': 'application/json' },
        });

    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] }),
    });

    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request,
    });

    assert.equal(response.status, 500);
    const payload = await response.clone().json();
    assert.match(payload.error, /Unable to retrieve analyst response/i);
    assert.match(payload.details, /401 Unauthorized/i);
    assert.match(payload.details, /Invalid token/i);
});

test('onRequestPost rejects unsupported methods', async () => {
    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request: new Request('https://example.com/api/chat', { method: 'GET' }),
    });

    assert.equal(response.status, 405);
});

test('onRequestPost prefers client system prompt and removes leading assistant', async () => {
    const requests = [];
    globalThis.fetch = async (input, init) => {
        requests.push({ input, init });
        return new Response(
            JSON.stringify({
                result: {
                    response: 'Ready.',
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
                { role: 'system', content: 'Use pirate voice.' },
                { role: 'assistant', content: 'Ahoy.' },
                { role: 'assistant', content: 'What now?' },
                { role: 'user', content: 'Status update.' },
            ],
        }),
    });

    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request,
    });

    assert.equal(response.status, 200);
    const payload = JSON.parse(requests[0].init.body);
    assert.equal(payload.messages.length, 2); // system + first user message
    assert.equal(payload.messages[0].content, 'Use pirate voice.');
    assert.equal(payload.messages[1].role, 'user');
});

test('onRequestPost supports custom model endpoint configuration', async () => {
    const requests = [];
    globalThis.fetch = async (input, init) => {
        requests.push({ input, init });
        return new Response(
            JSON.stringify({
                result: {
                    response: 'Configured.',
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
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] }),
    });

    await onRequestPost({
        env: {
            CLOUDFLARE_ACCOUNT_ID: 'acct',
            CLOUDFLARE_AI_TOKEN: 'token',
            CLOUDFLARE_AI_BASE_URL: 'https://gateway.ai.cloudflare.com/v1/acct/gateway',
            CLOUDFLARE_AI_MODEL: '@cf/meta/llama-3-8b-instruct',
        },
        request,
    });

    assert.equal(requests[0].input, 'https://gateway.ai.cloudflare.com/v1/acct/gateway/@cf/meta/llama-3-8b-instruct');
});

test('onRequestPost extracts replies from OpenAI-style choices arrays', async () => {
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                choices: [
                    {
                        message: { content: 'External provider response' },
                    },
                ],
            }),
            { headers: { 'content-type': 'application/json' } }
        );

    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Status update.' }] }),
    });

    const response = await onRequestPost({
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request,
    });

    assert.equal(response.status, 200);
    const payload = await response.clone().json();
    assert.equal(payload.reply, 'External provider response');
});
