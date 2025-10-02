import { midjourneyStatus } from '../../../lib/midjourney-proxy.js';

export async function onRequest(context) {
    return midjourneyStatus(context);
}
