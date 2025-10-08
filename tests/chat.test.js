import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../functions/api/chat.js';

test('onRequestPost returns archived notice for valid requests', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Ping' }] }),
    });

    const response = await onRequestPost({ request });

    assert.equal(response.status, 200);
    const payload = await response.clone().json();
    assert.match(payload.reply, /offline/i);
    assert.match(payload.notice, /Workers AI integration removed/i);
    assert.ok(typeof payload.createdAt === 'string' && payload.createdAt.length > 0);
});

test('onRequestPost rejects invalid payloads', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notMessages: true }),
    });

    const response = await onRequestPost({ request });

    assert.equal(response.status, 400);
    const payload = await response.clone().json();
    assert.match(payload.error, /message/i);
});

test('onRequestPost requires at least one user message', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'assistant', content: 'Hi' }] }),
    });

    const response = await onRequestPost({ request });

    assert.equal(response.status, 400);
    const payload = await response.clone().json();
    assert.match(payload.error, /user message/i);
});

test('onRequestPost rejects unsupported methods', async () => {
    const response = await onRequestPost({
        request: new Request('https://example.com/api/chat', { method: 'GET' }),
    });

    assert.equal(response.status, 405);
});
