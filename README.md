# HackTech: The Cyber Frontier

This repository contains a static, multi-page version of the original HackTech experience rebuilt so it can be deployed directly to [Cloudflare Pages](https://developers.cloudflare.com/pages/) or any static host. The new structure mirrors all of the existing content—Daily Briefing, Breach Archives, Arsenal, and Contact—while separating reusable assets so they can be cached efficiently by Cloudflare's CDN.

## Project structure

```
  public/
    index.html                # Landing page
    daily-briefing.html       # AI briefing page powered by Cloudflare Workers AI
    chat-console.html         # Dedicated analyst console backed by Workers AI chat
    ethical-hacking-tutorials.html # Curated training tracks and resources
    breach-archives.html      # Historical case studies
    arsenal.html              # Curated tooling collection
    contact.html              # Secure contact form instructions
  assets/
    css/styles.css          # Shared visual design
    js/matrix.js            # Matrix rain background effect
    js/site.js              # Navigation + lucide bootstrap
    js/briefing.js          # Front-end fetcher for the Cloudflare AI briefing
functions/
  api/briefing.js           # Cloudflare Pages Function proxying Workers AI
```

## Local development

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) if you have not already.
2. Create a `.dev.vars` file in the project root so the local dev server can reach Cloudflare AI:
   ```bash
   cat <<'EOF' > .dev.vars
   CLOUDFLARE_ACCOUNT_ID=e8823131dce5e3dcaedec59bb4f7c093
   CLOUDFLARE_AI_TOKEN=YOUR_TEMP_DEVELOPMENT_TOKEN
   # Optional overrides if you are using a custom AI Gateway or a different model
   # CLOUDFLARE_AI_GATEWAY_ID=vck_2v6dyFw9v3TbdmuMDXuJnPD2QWD4M5bRQV5iFQm8nU3aDKW7iT2NAZuo
   # CLOUDFLARE_AI_BASE_URL=https://gateway.ai.cloudflare.com/v1/ACCOUNT/GATEWAY
   # CLOUDFLARE_AI_MODEL=@cf/meta/llama-3-8b-instruct
   MIDJOURNEY_PROXY_URL=https://your-midjourney-proxy.example.com
   EOF
   ```
   Replace `YOUR_TEMP_DEVELOPMENT_TOKEN` with a valid API token. The token is read only by Wrangler during local development and should **not** be committed to git.
3. Run the Pages preview with Functions support:
   ```bash
   npx wrangler pages dev public
   ```
4. Open the printed URL in your browser to view the site. The `/api/briefing` route proxies the Cloudflare AI request so your token stays server-side.

## Deploying to Cloudflare Pages

1. Create (or select) a Cloudflare Pages project from the dashboard.
2. Connect the repository, set the **Framework preset** to **None**, and the **Build output directory** to `public`.
3. In the Pages project settings, add the following environment variables under **Functions → Environment variables**:
   - `CLOUDFLARE_ACCOUNT_ID` → `e8823131dce5e3dcaedec59bb4f7c093`
 - `CLOUDFLARE_AI_TOKEN` → (create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens) with the **AI** scope and paste it here)
  - `CLOUDFLARE_AI_GATEWAY_ID` (optional) → Override the default AI Gateway identifier (`vck_2v6dyFw9v3TbdmuMDXuJnPD2QWD4M5bRQV5iFQm8nU3aDKW7iT2NAZuo`).
  - `CLOUDFLARE_AI_BASE_URL` (optional) → Base URL for a [Cloudflare AI Gateway](https://developers.cloudflare.com/workers-ai/ai-gateway/) or alternate endpoint. Leave unset to use the default gateway associated with this project.
  - `CLOUDFLARE_AI_MODEL` (optional) → Workers AI model slug (defaults to `@cf/meta/llama-3-8b-instruct`).
  - `MIDJOURNEY_PROXY_URL` → URL of your deployed [midjourney-proxy](https://github.com/novicezk/midjourney-proxy) instance (for example, `https://your-midjourney-proxy.example.com`)
4. Trigger a deploy. Cloudflare will publish every file inside `public` and execute `functions/api/briefing.js` for `/api/briefing` requests.
5. If you prefer deploying from the CLI, run:
   ```bash
   npx wrangler pages deploy public
   ```

   When prompted, select the Pages project you configured above. Wrangler will reuse the environment variables defined in the dashboard.

## Updating integrations

- **Daily Briefing**: The front end calls `/api/briefing`, which in turn invokes Cloudflare's `@cf/meta/llama-3-8b-instruct` model via the configured AI Gateway. Adjust the prompt in `functions/api/briefing.js` or point it at a different [Cloudflare AI model](https://developers.cloudflare.com/workers-ai/models/) by changing the endpoint path or gateway configuration.
- **Midjourney deck**: Configure `MIDJOURNEY_PROXY_URL` to point at your Midjourney proxy. Pages Functions expose `/api/midjourney/*` as a CORS-enabled pass-through so the embedded Lobe Midjourney UI can route imagine/upscale calls securely. Hit `/api/midjourney/status` to confirm the proxy is reachable—responses include a summarized payload from `/mj`.
- **Contact form**: Replace `YOUR_UNIQUE_FORMSPREE_ENDPOINT` in `public/contact.html` with the endpoint provided by Formspree (or swap in your preferred provider).

## Notes

- Navigation highlighting is driven by the `data-page` attribute on `<body>`—set this value on any new page for consistent behaviour.
- Lucide icons load from the official CDN; replace with a pinned version if you prefer long-term stability.
- All styling uses the handcrafted CSS in `assets/css/styles.css` so you can tune the cyber aesthetic without editing each page.
