# Current Site Operations Conflicts

The following production-impacting conflicts are present in the Worker and Pages operations codebase.

## Cloudflare Workers AI integrations (daily briefing & analyst chat)
- Both `functions/api/briefing.js` and `functions/api/chat.js` ship with placeholder credentials (`demo-account-id`, `demo-api-token`, `demo-gateway`).【F:functions/api/briefing.js†L1-L55】【F:functions/api/chat.js†L8-L103】
- When those defaults are used, the Workers AI gateway returns 401 responses, which the chat handler surfaces as operational errors (`Unable to retrieve analyst response`).【F:functions/api/chat.js†L160-L201】【a02637†L1-L17】
- **Action:** Set the environment variables to the real Cloudflare account (`CLOUDFLARE_ACCOUNT_ID=<your-account-id>`), API token, and gateway/model before deploying. Update `wrangler.toml` or the Pages project variables accordingly.

## Wrangler configuration
- The root `wrangler.toml` currently points to the all-zero placeholder account ID, so any `wrangler` deploys will target a non-existent account.【F:wrangler.toml†L1-L4】
- **Action:** Replace the placeholder with the real account ID (for example, by pulling it from your deployment secrets manager) before publishing Workers.

## Midjourney proxy endpoints
- The proxy helper in `lib/midjourney-proxy.js` fails fast when `MIDJOURNEY_PROXY_URL` is unset, returning JSON errors instead of forwarding image jobs.【F:lib/midjourney-proxy.js†L57-L125】
- **Action:** Configure `MIDJOURNEY_PROXY_URL` in the Pages/Worker environment to restore `/api/midjourney/*` routing.

## Contact relay defaults
- The contact form handler hard-codes `CONTACT_TO_EMAIL` to `hoya282@gmail.com` whenever the environment variable is missing.【F:functions/api/contact.js†L1-L88】
- **Action:** Provide the correct destination email (for example, `security@freespirits.io`) via environment variables to avoid misrouting sensitive inquiries.
