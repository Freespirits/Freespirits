# Current Site Operations Conflicts

The following production-impacting conflicts are present in the Worker and Pages operations codebase.

## Cloudflare Workers AI integrations (daily briefing)
- `functions/api/briefing.js` still ships with placeholder credentials (`demo-account-id`, `demo-api-token`, `demo-gateway`).【F:functions/api/briefing.js†L1-L55】
- The public analyst chat console has been removed. `/api/chat` only returns a retirement notice so no Workers AI configuration is required for that route.【F:functions/api/chat.js†L1-L35】
- **Action:** If you plan to re-enable the automated briefing, set the environment variables to the real Cloudflare account (`CLOUDFLARE_ACCOUNT_ID=e8823131dce5e3dcaedec59bb4f7c093`), API token, and gateway/model before deploying. Update `wrangler.toml` or the Pages project variables accordingly.

## Wrangler configuration
- The root `wrangler.toml` currently points to the all-zero placeholder account ID, so any `wrangler` deploys will target a non-existent account.【F:wrangler.toml†L1-L4】
- **Action:** Replace the placeholder with the real account ID before publishing Workers.

## Midjourney proxy endpoints
- The proxy helper in `lib/midjourney-proxy.js` fails fast when `MIDJOURNEY_PROXY_URL` is unset, returning JSON errors instead of forwarding image jobs.【F:lib/midjourney-proxy.js†L57-L125】
- **Action:** Configure `MIDJOURNEY_PROXY_URL` in the Pages/Worker environment to restore `/api/midjourney/*` routing.

## Contact relay defaults
- The contact form handler hard-codes `CONTACT_TO_EMAIL` to `admin@hack-tech.org` whenever the environment variable is missing.【F:functions/api/contact.js†L1-L88】
- **Action:** Provide the correct destination email (for example, `admin@hack-tech.org`) via environment variables to avoid misrouting sensitive inquiries.

---

Refer to [`cloudflare-ai-configuration.md`](./cloudflare-ai-configuration.md) for step-by-step instructions on supplying the required Cloudflare credentials and deploying the worker with real tokens.
