import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/briefing.js';

test('onRequestGet returns a 410 gone notice', async () => {
    const response = await onRequestGet({
        request: new Request('https://example.com/api/briefing'),
    });

    assert.equal(response.status, 410);
    const payload = await response.clone().json();
    assert.match(payload.error, /retired/i);
    assert.match(payload.notice, /removed/i);
});
