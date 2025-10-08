import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/briefing.js';

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
});

after(() => {
    if (originalCaches === undefined) {
        delete globalThis.caches;
    } else {
        globalThis.caches = originalCaches;
    }
});

test('onRequestGet returns archived payload and caches the result', async () => {
    const waitUntilPromises = [];

    const context = {
        request: new Request('https://example.com/api/briefing'),
        waitUntil(promise) {
            waitUntilPromises.push(promise);
        },
    };

    const response = await onRequestGet(context);
    assert.equal(response.status, 200);

    const body = await response.clone().json();
    assert.match(body.markdown, /Recent Data Breaches/);
    assert.ok(typeof body.generatedAt === 'string' && body.generatedAt.length > 0);
    assert.doesNotThrow(() => new Date(body.generatedAt));
    assert.match(body.notice, /Workers AI feed retired/i);

    await Promise.all(waitUntilPromises);

    const cachedResponse = await caches.default.match(new Request('https://example.com/api/briefing'));
    assert.ok(cachedResponse, 'cache should contain a cloned response');

    const secondResponse = await onRequestGet({ ...context, waitUntil: () => {} });
    assert.equal((await secondResponse.clone().json()).markdown, body.markdown);
});

test('onRequestGet still responds when no cache exists', async () => {
    const response = await onRequestGet({
        request: new Request('https://example.com/api/briefing'),
    });

    assert.equal(response.status, 200);
    const payload = await response.clone().json();
    assert.ok(payload.markdown.includes('###'));
    assert.ok(payload.notice.includes('Workers AI'));
});
