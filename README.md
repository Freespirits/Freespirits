# HackTech: The Cyber Frontier

This repository contains a static, multi-page version of the original HackTech experience rebuilt so it can be deployed directly to [Cloudflare Pages](https://developers.cloudflare.com/pages/) or any static host. The new structure mirrors all of the existing content—Daily Briefing, Breach Archives, Arsenal, and Contact—while separating reusable assets so they can be cached efficiently by Cloudflare's CDN.

## Project structure

```
public/
  index.html                # Landing page
  daily-briefing.html       # AI briefing page powered by Cloudflare Workers AI
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
2. Create a `.dev.vars` file in the project root so the local dev server can reach the AI providers:
   ```bash
   cat <<'EOF' > .dev.vars
   CLOUDFLARE_ACCOUNT_ID=e8823131dce5e3dcaedec59bb4f7c093
   CLOUDFLARE_AI_TOKEN=YOUR_TEMP_DEVELOPMENT_TOKEN
   # Optional: enable the Hugging Face fallback provider
   HUGGINGFACE_API_TOKEN=YOUR_HUGGINGFACE_TOKEN
   # HUGGINGFACE_API_URL=https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2
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
   - Optional Hugging Face integration:
     - `HUGGINGFACE_API_TOKEN` → A [Hugging Face access token](https://huggingface.co/docs/api-inference/quicktour#get-your-api-token) with **read** scope
     - `HUGGINGFACE_API_URL` → (optional override) Defaults to the free community model `mistralai/Mistral-7B-Instruct-v0.2`
4. Trigger a deploy. Cloudflare will publish every file inside `public` and execute `functions/api/briefing.js` for `/api/briefing` requests.
5. If you prefer deploying from the CLI, run:
   ```bash
   npx wrangler pages deploy public
   ```

   When prompted, select the Pages project you configured above. Wrangler will reuse the environment variables defined in the dashboard.

## Configuring AI integrations

- **Supported providers**: The `/api/briefing` Pages Function now supports both [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) and the free [Hugging Face Inference API](https://huggingface.co/docs/api-inference/quicktour). Visitors can toggle between the providers directly on the Daily Briefing page.
- **Daily Briefing prompts**: The shared prompt lives in `functions/api/briefing.js`. Adjust the text once and both providers receive the same instruction set.
- **Adding more providers**: Extend the `PROVIDER_HANDLERS` map in `functions/api/briefing.js` with a new async function. Each handler simply needs to return a markdown string.

- **Contact form**: Replace `YOUR_UNIQUE_FORMSPREE_ENDPOINT` in `public/contact.html` with the endpoint provided by Formspree (or swap in your preferred provider).

## Notes

- Navigation highlighting is driven by the `data-page` attribute on `<body>`—set this value on any new page for consistent behaviour.
- Lucide icons load from the official CDN; replace with a pinned version if you prefer long-term stability.
- All styling uses the handcrafted CSS in `assets/css/styles.css` so you can tune the cyber aesthetic without editing each page.
