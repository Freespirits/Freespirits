# Cloudflare Workers AI Configuration (Chat & Daily Briefing)

The project uses Cloudflare Workers AI to power both the `/api/chat` endpoint (the Analyst Chat console) and the `/api/briefing` endpoint (the Daily Briefing feed). By default, the worker code ships with "demo" credentials so it will fail until real values are supplied. The API handlers now detect those placeholders and return a clear configuration error instead of forwarding the request. Follow the steps below to connect the application to a real Cloudflare account and token.

## 1. Gather credentials

- **Account ID:** `e8823131dce5e3dcaedec59bb4f7c093`
- **Worker AI Gateway slug:** choose or create one in the [Cloudflare AI dashboard](https://dash.cloudflare.com/)
- **Workers AI model identifier:** for example `@cf/meta/llama-3-8b-instruct` or any other model you wish to use
- **API token:** create a token with permission to invoke Workers AI (do not commit this token to source control)

## 2. Configure environment variables

The worker expects the following environment variables:

| Variable | Description |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID that owns the Workers AI deployment |
| `CLOUDFLARE_AI_GATEWAY` | Gateway slug configured in Cloudflare AI |
| `CLOUDFLARE_AI_TOKEN` | API token for Workers AI. Store as a secret. |
| `CLOUDFLARE_AI_MODEL` | (Optional) Override the default model. |
| `CLOUDFLARE_AI_BASE_URL` | (Optional) Full URL to the gateway; otherwise the worker builds it from account + gateway. |

> **Token fallback compatibility:** The worker will also accept the token via `AI_GATEWAY_API_KEY`, `CLOUDFLARE_API_TOKEN`, or `WORKERS_AI_TOKEN` environment variables. Use whichever name best matches your deployment secrets manager; the first non-empty value is used.

### Wrangler configuration (local / CI)

Add the variables via `wrangler` so that local development and deployments use the correct values:

```bash
# Set non-secret variables directly in wrangler
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_AI_GATEWAY
npx wrangler secret put CLOUDFLARE_AI_MODEL   # optional override, e.g. @cf/meta/llama-3-8b-instruct

# Store the API token securely
npx wrangler secret put CLOUDFLARE_AI_TOKEN
```

Alternatively, create a `.dev.vars` file for local testing (never commit it):

```
CLOUDFLARE_ACCOUNT_ID="e8823131dce5e3dcaedec59bb4f7c093"
CLOUDFLARE_AI_GATEWAY="demo-gateway"           # replace with your gateway slug
CLOUDFLARE_AI_MODEL="@cf/meta/llama-3-8b-instruct"
CLOUDFLARE_AI_TOKEN="your-workers-ai-token"
```

## 3. Deploy with Wrangler

After the environment variables are configured, deploy the worker:

```bash
npx wrangler deploy
```

The deployment will use the configured account ID and gateway to invoke Cloudflare Workers AI. Both the `/api/chat` and `/api/briefing` endpoints will now return live responses instead of the placeholder error.

## 4. Test the Worker AI endpoint manually

You can send a direct API call to verify the configuration (replace the token with your actual secret):

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/e8823131dce5e3dcaedec59bb4f7c093/ai/run/@cf/meta/llama-3-8b-instruct" \
  -H "Authorization: Bearer <YOUR_WORKERS_AI_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
        "messages": [
          {"role": "system", "content": "You are a friendly assistant that helps write stories"},
          {"role": "user", "content": "Write a short story about a llama that goes on a journey to find an orange cloud"}
        ]
      }'
```

If the call succeeds, the worker endpoints should also function when invoked through the web application.

## 5. Cloudflare Pages configuration

If deploying via Cloudflare Pages, add the same variables in the Pages project settings under **Environment Variables** or **Secrets**:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_GATEWAY`
- `CLOUDFLARE_AI_MODEL`
- `CLOUDFLARE_AI_TOKEN`

Be sure to set them for both Production and Preview environments if you use both.

## 6. Security reminders

- Never commit the API token to version control or share it publicly.
- Rotate the token if you suspect it may have been exposed.
- Use scoped permissions for the token (Workers AI invocation only) to reduce impact if compromised.

With these settings applied, the chat and daily briefing features will source responses from your Cloudflare Workers AI deployment.
