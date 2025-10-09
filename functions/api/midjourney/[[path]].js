import { proxyToMidjourney } from '../../../lib/midjourney-proxy.js';

export async function onRequest(context) {
    return proxyToMidjourney(context, context.params?.path);
}
