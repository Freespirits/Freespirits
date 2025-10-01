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
    js/chat.js              # Analyst chat console powered by Workers AI
functions/
  api/briefing.js           # Cloudflare Pages Function proxying Workers AI
  api/chat.js               # Chat proxy relaying multi-turn analyst prompts
```

## Local development

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) if you have not already.
2. Create a `.dev.vars` file in the project root so the local dev server can reach Cloudflare AI for both the daily briefing and the live analyst chat:
   ```bash
   cat <<'EOF' > .dev.vars
   CLOUDFLARE_ACCOUNT_ID=e8823131dce5e3dcaedec59bb4f7c093
   CLOUDFLARE_AI_TOKEN=YOUR_TEMP_DEVELOPMENT_TOKEN
   EOF
   ```
   Replace `YOUR_TEMP_DEVELOPMENT_TOKEN` with a valid API token (for example the bearer token provided in the Cloudflare dashboard). The token is read only by Wrangler during local development and should **not** be committed to git.
3. Run the Pages preview with Functions support:
   ```bash
   npx wrangler pages dev public
   ```
4. Open the printed URL in your browser to view the site. The `/api/briefing` and `/api/chat` routes proxy the Cloudflare AI requests so your token stays server-side.

## Deploying to Cloudflare Pages

1. Create (or select) a Cloudflare Pages project from the dashboard.
2. Connect the repository, set the **Framework preset** to **None**, and the **Build output directory** to `public`.
3. In the Pages project settings, add the following environment variables under **Functions → Environment variables** (the same values power the daily briefing and the live analyst chat):
   - `CLOUDFLARE_ACCOUNT_ID` → `e8823131dce5e3dcaedec59bb4f7c093`
   - `CLOUDFLARE_AI_TOKEN` → (create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens) with the **AI** scope and paste it here)
4. Trigger a deploy. Cloudflare will publish every file inside `public` and execute `functions/api/briefing.js` for `/api/briefing` requests.
5. If you prefer deploying from the CLI, run:
   ```bash
   npx wrangler pages deploy public
   ```

   When prompted, select the Pages project you configured above. Wrangler will reuse the environment variables defined in the dashboard.

## Updating integrations

- **Daily Briefing**: The front end calls `/api/briefing`, which in turn invokes Cloudflare's `@cf/meta/llama-3-8b-instruct` model. Adjust the prompt in `functions/api/briefing.js` or point it at a different [Cloudflare AI model](https://developers.cloudflare.com/workers-ai/models/) by changing the endpoint path.
- **Analyst Chat Console**: The chat UI posts to `/api/chat`. The function sanitizes the conversation history, injects the analyst system prompt, and relays the request to `@cf/meta/llama-3-8b-instruct`. Supply the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN` variables so the analyst stays connected.
- **Contact form**: Replace `YOUR_UNIQUE_FORMSPREE_ENDPOINT` in `public/contact.html` with the endpoint provided by Formspree (or swap in your preferred provider).

## Notes

- Navigation highlighting is driven by the `data-page` attribute on `<body>`—set this value on any new page for consistent behaviour.
- Lucide icons load from the official CDN; replace with a pinned version if you prefer long-term stability.
- All styling uses the handcrafted CSS in `assets/css/styles.css` so you can tune the cyber aesthetic without editing each page.
