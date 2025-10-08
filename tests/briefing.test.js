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
        env: { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_AI_TOKEN: 'token', CLOUDFLARE_AI_GATEWAY: 'intel-gateway' },
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

    assert.equal(
        fetchCalls[0][0],
        'https://gateway.ai.cloudflare.com/v1/acct/intel-gateway/workers-ai/@cf/meta/llama-3.1-8b-instruct'
    );
});

test('onRequestGet returns a configuration error when credentials are missing', async () => {
    const calls = [];
    globalThis.fetch = async (...args) => {
        calls.push(args);
        throw new Error('fetch should not be invoked without credentials');
    };

    const response = await onRequestGet({
        env: {},
        request: new Request('https://example.com/api/briefing'),
    });

    assert.equal(response.status, 500);
    const payload = await response.clone().json();
    assert.match(payload.error, /environment variables are not configured/i);
    assert.equal(calls.length, 0, 'request should not be forwarded without credentials');
});
