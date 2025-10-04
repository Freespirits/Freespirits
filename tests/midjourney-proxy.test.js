import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { proxyToMidjourney, midjourneyStatus } from '../lib/midjourney-proxy.js';

const originalFetch = globalThis.fetch;

beforeEach(() => {
    globalThis.fetch = async () =>
        new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
});

after(() => {
    globalThis.fetch = originalFetch;
});

const decodeBody = (input) => {
    if (!input) {
        return '';
    }

    if (typeof input === 'string') {
        return input;
    }

    if (input instanceof ArrayBuffer) {
        return Buffer.from(input).toString();
    }

    return Buffer.from(input).toString();
};

test('proxyToMidjourney forwards path, query, headers, and method', async () => {
    const requests = [];
    globalThis.fetch = async (input, init) => {
        requests.push({ input, init });
        return new Response('{"jobs":[]}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    const request = new Request('https://hacktech.example/api/midjourney/mj/status?foo=bar');

    const response = await proxyToMidjourney(
        {
            env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com' },
            request,
        },
        ['mj', 'status']
    );

    assert.equal(response.status, 200);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].input, 'https://proxy.example.com/mj/status?foo=bar');
    assert.equal(requests[0].init.method, 'GET');
    assert.equal(requests[0].init.headers.get('origin'), 'https://proxy.example.com');
    assert.equal(response.headers.get('access-control-allow-origin'), '*');

    const body = await response.text();
    assert.equal(body, '{"jobs":[]}');
});

test('proxyToMidjourney preserves base query parameters', async () => {
    const requests = [];
    globalThis.fetch = async (input, init) => {
        requests.push({ input, init });
        return new Response('{"ok":true}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    const request = new Request('https://hacktech.example/api/midjourney/mj/status?foo=bar&foo=baz');

    const response = await proxyToMidjourney(
        {
            env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com/base?token=secret' },
            request,
        },
        ['mj', 'status']
    );

    assert.equal(response.status, 200);
    assert.equal(requests.length, 1);
    assert.equal(
        requests[0].input,
        'https://proxy.example.com/base/mj/status?token=secret&foo=bar&foo=baz'
    );
});

test('proxyToMidjourney forwards request bodies for mutations', async () => {
    const requests = [];
    globalThis.fetch = async (input, init) => {
        requests.push({ input, init });
        return new Response('{"id":"task-123"}', {
            status: 202,
            headers: { 'content-type': 'application/json' },
        });
    };

    const request = new Request('https://hacktech.example/api/midjourney/mj/task', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: 'image payload' }),
    });

    const response = await proxyToMidjourney(
        {
            env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com' },
            request,
        },
        ['mj', 'task']
    );

    assert.equal(response.status, 202);
    assert.equal(requests.length, 1);
    assert.equal(decodeBody(requests[0].init.body), JSON.stringify({ prompt: 'image payload' }));
});

test('proxyToMidjourney returns configuration errors as JSON', async () => {
    const response = await proxyToMidjourney(
        {
            env: {},
            request: new Request('https://hacktech.example/api/midjourney'),
        },
        []
    );

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.match(payload.error, /not configured/i);
});

test('midjourneyStatus reports upstream success details', async () => {
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({ version: '1.2.3', routes: ['/mj/task'] }),
            {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }
        );

    const response = await midjourneyStatus({
        env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com' },
        request: new Request('https://hacktech.example/api/midjourney/status'),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.upstreamStatus, 200);
    assert.deepEqual(payload.upstream, { version: '1.2.3', routes: ['/mj/task'] });
    assert.match(payload.message, /responded successfully/i);
    assert.equal(typeof payload.responseTimeMs, 'number');
    assert(payload.responseTimeMs >= 0);
    assert.match(payload.checkedAt, /T/);
});

test('midjourneyStatus surfaces upstream failures', async () => {
    globalThis.fetch = async () =>
        new Response('proxy down', {
            status: 503,
            headers: { 'content-type': 'text/plain' },
        });

    const response = await midjourneyStatus({
        env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com' },
        request: new Request('https://hacktech.example/api/midjourney/status'),
    });

    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.upstreamStatus, 503);
    assert.match(payload.error, /proxy down/i);
    assert.equal(typeof payload.responseTimeMs, 'number');
    assert(payload.responseTimeMs >= 0);
    assert.match(payload.checkedAt, /T/);
});

test('midjourneyStatus enforces method restrictions', async () => {
    const response = await midjourneyStatus({
        env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com' },
        request: new Request('https://hacktech.example/api/midjourney/status', { method: 'POST' }),
    });

    assert.equal(response.status, 405);
    assert.match((await response.json()).error, /method not allowed/i);
});

test('midjourneyStatus returns configuration errors clearly', async () => {
    const response = await midjourneyStatus({
        env: {},
        request: new Request('https://hacktech.example/api/midjourney/status'),
    });

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.match(payload.error, /not configured/i);
    assert.match(payload.checkedAt, /T/);
});

test('proxyToMidjourney handles preflight requests', async () => {
    const response = await proxyToMidjourney(
        {
            env: { MIDJOURNEY_PROXY_URL: 'https://proxy.example.com' },
            request: new Request('https://hacktech.example/api/midjourney', { method: 'OPTIONS' }),
        },
        []
    );

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
});
