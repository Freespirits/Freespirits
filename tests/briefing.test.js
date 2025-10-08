import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/briefing.js';

test('onRequestGet returns a 410 gone notice', async () => {
    const response = await onRequestGet({
        request: new Request('https://example.com/api/briefing'),
        waitUntil() {},
    };

    assert.equal(response.status, 410);
    const payload = await response.clone().json();
    assert.match(payload.error, /retired/i);
    assert.match(payload.notice, /removed/i);
    const response = await onRequestGet(context);
    assert.equal(response.status, 200);
    const payload = await response.clone().json();
    assert.equal(payload.markdown, '### Recent Data Breaches\n* fallback token breach');
    assert.equal(requests.length, 1);
    assert.match(requests[0][1].headers.Authorization, /gateway-key/);
});
