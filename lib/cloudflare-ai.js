export const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';
export const DEFAULT_GATEWAY_ID = 'vck_2v6dyFw9v3TbdmuMDXuJnPD2QWD4M5bRQV5iFQm8nU3aDKW7iT2NAZuo';
const GATEWAY_BASE_URL = 'https://gateway.ai.cloudflare.com/v1';

function normalizeModelSlug(model) {
    return model.replace(/^\/+/, '');
}

export function resolveAiEndpoint(env, accountId) {
    const model = normalizeModelSlug(((env?.CLOUDFLARE_AI_MODEL ?? '').trim()) || DEFAULT_MODEL);
    const baseUrl = (env?.CLOUDFLARE_AI_BASE_URL ?? '').trim();

    if (!baseUrl) {
        const gatewayId = ((env?.CLOUDFLARE_AI_GATEWAY_ID ?? '').trim()) || DEFAULT_GATEWAY_ID;
        return `${GATEWAY_BASE_URL}/${accountId}/${gatewayId}/${model}`;
    }

    let parsed;
    try {
        parsed = new URL(baseUrl);
    } catch (error) {
        throw new Error('CLOUDFLARE_AI_BASE_URL must be a valid absolute URL.');
    }

    if (!parsed.pathname.endsWith('/')) {
        parsed.pathname = `${parsed.pathname}/`;
    }

    return `${parsed.toString()}${model}`;
}
