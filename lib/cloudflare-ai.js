export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const DEFAULT_GATEWAY_ID = 'my-gateway';
const GATEWAY_BASE_URL = 'https://gateway.ai.cloudflare.com/v1';
const GATEWAY_SERVICE_SEGMENT = 'workers-ai';

function normalizeModelSlug(model) {
    return model.replace(/^\/+/, '');
}

export function resolveAiEndpoint(env, accountId) {
    const model = normalizeModelSlug(((env?.CLOUDFLARE_AI_MODEL ?? '').trim()) || DEFAULT_MODEL);
    const baseUrl = (env?.CLOUDFLARE_AI_BASE_URL ?? '').trim();

    if (!baseUrl) {
        const gatewayId = ((env?.CLOUDFLARE_AI_GATEWAY_ID ?? '').trim()) || DEFAULT_GATEWAY_ID;
        return `${GATEWAY_BASE_URL}/${accountId}/${gatewayId}/${GATEWAY_SERVICE_SEGMENT}/${model}`;
    }

    let parsed;
    try {
        parsed = new URL(baseUrl);
    } catch (error) {
        throw new Error('CLOUDFLARE_AI_BASE_URL must be a valid absolute URL.');
    }

    const trimmedPath = parsed.pathname.replace(/\/+$/, '');
    const segments = trimmedPath
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
    const endsWithService = segments[segments.length - 1] === GATEWAY_SERVICE_SEGMENT;
    const isGatewayHost = parsed.hostname === 'gateway.ai.cloudflare.com';

    let normalizedPath;
    if (isGatewayHost) {
        normalizedPath = endsWithService ? `${trimmedPath}/` : `${trimmedPath}/${GATEWAY_SERVICE_SEGMENT}/`;
    } else {
        normalizedPath = `${trimmedPath}/`;
    }

    if (!normalizedPath.startsWith('/')) {
        normalizedPath = `/${normalizedPath}`;
    }

    normalizedPath = normalizedPath.replace(/\/{2,}/g, '/');

    parsed.pathname = normalizedPath;

    return `${parsed.toString()}${model}`;
}
