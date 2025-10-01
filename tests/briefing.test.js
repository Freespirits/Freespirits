import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/briefing.js';

const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;

beforeEach(() => {
    const store = new Map();

    globalThis.caches = {
        default: {
            async match(request) {
                return store.get(request.url) ?? null;
            },
            async put(request, response) {
                store.set(request.url, response);
            },
        },
    };

    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                result: {
                    response: '### Recent Data Breaches\n* breach detail',
                },
            }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
});

after(() => {
    globalThis.fetch = originalFetch;
    if (originalCaches === undefined) {
        delete globalThis.caches;
    } else {
        globalThis.caches = originalCaches;
    }
});

test('onRequestGet returns AI response payload and caches the result', async () => {
    const waitUntilPromises = [];
    const fetchCalls = [];

    globalThis.fetch = async (...args) => {
        fetchCalls.push(args);
        return new Response(
            JSON.stringify({
                result: {
                    response: '### Recent Data Breaches\n* breach detail',
                },
            }),
            {
                headers: { 'content-type': 'application/json' },
            }
        );
    };

    const context = {
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token' },
        request: new Request('https://example.com/api/briefing'),
        waitUntil(promise) {
            waitUntilPromises.push(promise);
        },
    };

    const response = await onRequestGet(context);
    assert.equal(response.status, 200);

    const body = await response.clone().json();
    assert.equal(body.markdown, '### Recent Data Breaches\n* breach detail');
    assert.ok(typeof body.generatedAt === 'string' && body.generatedAt.length > 0);
    assert.doesNotThrow(() => new Date(body.generatedAt));

    await Promise.all(waitUntilPromises);

    const cachedResponse = await caches.default.match(new Request('https://example.com/api/briefing'));
    assert.ok(cachedResponse, 'cache should contain a cloned response');

    const secondResponse = await onRequestGet({ ...context, waitUntil: () => {} });
    assert.equal(fetchCalls.length, 1, 'AI fetch should only happen once');
    assert.equal((await secondResponse.clone().json()).markdown, body.markdown);
});

test('onRequestGet fails when AI credentials are missing', async () => {
    const response = await onRequestGet({
        env: {},
        request: new Request('https://example.com/api/briefing'),
    });

    assert.equal(response.status, 500);
    const payload = await response.clone().json();
    assert.match(payload.error, /no ai providers/i);
});

test('onRequestGet falls back to Vercel AI Gateway when Cloudflare fails', async () => {
    const waitUntilPromises = [];
    const fetchCalls = [];

    const cloudflareFailure = new Response('boom', { status: 500, statusText: 'Internal Server Error' });
    const vercelSuccess = new Response(
        JSON.stringify({
            choices: [
                {
                    message: {
                        content: '### Recent Data Breaches\n* fallback detail',
                    },
                },
            ],
        }),
        {
            headers: { 'content-type': 'application/json' },
        }
    );

    const responses = [cloudflareFailure, vercelSuccess];

    globalThis.fetch = async (...args) => {
        fetchCalls.push(args);
        return responses.shift() ?? vercelSuccess;
    };

    const context = {
        env: {
            CLOUDFLARE_ACCOUNT_ID: 'acct',
            CLOUDFLARE_AI_TOKEN: 'token',
            VERCEL_AI_GATEWAY_URL: 'https://gateway.example.com/openai/chat/completions',
            VERCEL_AI_GATEWAY_TOKEN: 'vercel-token',
            VERCEL_AI_MODEL: 'gpt-test',
        },
        request: new Request('https://example.com/api/briefing'),
        waitUntil(promise) {
            waitUntilPromises.push(promise);
        },
    };

    const response = await onRequestGet(context);
    assert.equal(response.status, 200);

    const body = await response.clone().json();
    assert.equal(body.markdown, '### Recent Data Breaches\n* fallback detail');

    await Promise.all(waitUntilPromises);

    assert.equal(fetchCalls.length, 2, 'should attempt Cloudflare and then Vercel');
    assert.ok(
        fetchCalls.some(([url]) => String(url).includes('gateway.example.com')),
        'should call Vercel gateway'
    );
});
