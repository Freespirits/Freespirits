import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/briefing.js';

test('onRequestGet returns a 410 gone notice', async () => {
    const response = await onRequestGet();

    assert.equal(response.status, 410);
    assert.equal(response.headers.get('content-type'), 'application/json');

    const payload = await response.clone().json();
    assert.match(payload.error, /retired/i);
    assert.match(payload.notice, /removed/i);
});
