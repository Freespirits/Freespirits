import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../functions/api/chat.js';

test('onRequestPost returns a 410 gone notice for POST requests', async () => {
    const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    });

    const response = await onRequestPost({ request });

    assert.equal(response.status, 410);
    const payload = await response.clone().json();
    assert.match(payload.error, /retired/i);
    assert.match(payload.notice, /removed/i);
});

test('onRequestPost continues to guard unsupported methods', async () => {
    const response = await onRequestPost({
        request: new Request('https://example.com/api/chat', { method: 'GET' }),
    });

    assert.equal(response.status, 405);
});
