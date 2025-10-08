<h1 align="center">🔓 Freespirits — Offensive Security / Pentester</h1>
<p align="center">
  Red Team · Web & API · Mobile · Cloud · Adversary Emulation · Bug Bounty
</p>

<p align="center">
  <a href="https://www.linkedin.com/in/freespirits"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white"></a>
  <a href="mailto:security@freespirits.io"><img alt="Email" src="https://img.shields.io/badge/Contact-security@freespirits.io-black"></a>
  <a href="https://keybase.io/freespirits"><img alt="PGP" src="https://img.shields.io/badge/PGP-verify-313131"></a>
  <img alt="Hire" src="https://img.shields.io/badge/Availability-Engagements%20Open-success">
  <img alt="Ethics" src="https://img.shields.io/badge/Ethical-Yes-brightgreen">
</p>

---

## TL;DR
I break things (legally) so you don’t get broken into. I deliver **clear, reproducible findings**, **business-risk mapping**, and **actionable fixes**—on time.

---

## Core Capability Matrix
| Area | Depth |
|---|---|
| **Web & API** | WSTG/OWASP Top 10, authz abuse (BOLA/BFLA), SSRF, deserialization, race conditions |
| **Mobile** | Android/iOS reversing, Frida/ObjC/Smali hooks, SSL pinning bypass, local storage abuses |
| **Cloud** | AWS/Azure/GCP misconfigs, IAM privilege escalation, CI/CD secrets, serverless abuse |
| **Infra/AD** | Kerberoast/AS-REP, constrained delegation, BloodHound paths, lateral movement |
| **Red Team** | OSINT, initial access, persistence, C2 OPSEC, detection engineering handoff |
| **Bug Bounty** | Recon automation, endpoint diffing, broken auth flows, mass assignment |

---

## Methodology (Standards-Aligned)
- **Scoping & Threat Modeling:** assets, data flows, abuse cases, impact map
- **Recon & Mapping:** OSINT, content discovery, API enumerations, attack surface diff
- **Exploitation:** safe PoCs, **no destructive payloads**; chain to business impact  
- **Post-Exploitation:** data access proof, least-privilege escalation checks  
- **Reporting:** CVSS/CWEs, reproducible steps, screenshots, **fix-first guidance**
- **Validation:** retest window + remediation verification

> References: PTES · OWASP WSTG/MASVS/MSTG · NIST 800-115 · OSSTMM

---

## Tooling (Representative)
`Burp Suite Pro` · `ffuf` · `httpx` · `nuclei` · `kxss` · `gf` · `waybackurls` · `amass` · `Subfinder`
`Mitmproxy` · `Frida` · `objection` · `jadx` · `apktool` · `radare2`
`BloodHound` · `SharpHound` · `CrackMapExec` · `Rubeus`
Cloud: `prowler` · `ScoutSuite` · `CloudFox` · IaC checks (`tfsec`, `checkov`)
Scripting: `Python`/`Go` + custom one-offs in `Tools/`

---

## Showcases
- **Selected Write-ups:**  
  - *BOLA → full tenant data exposure via predictable object IDs* — API pentest (2025)  
  - *OAuth device code mis-binding → account takeover* — Web app (2025)  
  - *AWS IAM pass-role chain → cross-account exfil* — Cloud (2024)

- **Public Research:**  
  - [https://freespirits.io/blog](https://freespirits.io/blog)  
  - [CVE-2024-12345, CVE-2023-9876]

- **Labs:** HTB ★★★ | TryHackMe ★★★ | PortSwigger Academy ★★★

---

## Reporting You Can Act On
- **Executive Summary:** business risk, exploit path, “fix this first” list  
- **Technical Appendix:** PoCs, impacted endpoints/assets, logs, screenshots  
- **Remediation Plan:** owner, effort, patch path, detection ideas  
- **Retest:** included with SOW; validation report provided

> Sample report (redacted): [`/reports/sample_redacted.pdf`](./reports/sample_redacted.pdf)

---

## Responsible Disclosure
I follow **coordinated disclosure**. For vendors/programs:
1. Email **security@freespirits.io** (PGP below) with steps and impact.  
2. I avoid data retention and use minimal proof data.  
3. 90-day default window unless agreed otherwise.

**PGP:** `FPR: 9D4C 3A5F 2B6E 7E1B 8A4C  1F6A 77E4 5E23 7A3E D8C1`

---

## How I Work (Engagement Flow)
1. **Discovery & Scope** → assets, constraints, success criteria  
2. **Rules of Engagement** → test windows, data handling, in/out-of-scope  
3. **Execution** → daily notes, mid-engagement checkpoint  
4. **Delivery** → debrief + report + tracking tickets (optional)  
5. **Validation** → retest + evidence

---

## Open-Source & Automation
- `recon/` — small utilities for passive/active recon at scale  
- `wordlists/` — context-specific parameter and endpoint lists  
- `nuclei-templates/` — safely-scoped checks used during engagements  
- `reporting/` — scripts to turn notes → markdown → PDF

> See `/Tools/README.md` for usage and safety notes.

---

## Ethics & Legal
- Testing requires **written authorization**.  
- I **do not** accept engagements involving ransomware, backdoors, or disruption.  
- All work follows data-minimization, encryption at rest/in transit, and secure evidence handling.

---

## Contact
- **Email:** security@freespirits.io
- **Signal:** +44 7123 456789 (on request)
- **PGP:** see “Responsible Disclosure”
- **Booking:** [https://calendly.com/freespirits/consult](https://calendly.com/freespirits/consult)

---

### Quick Facts
- Based in: London, UK · Timezone: Europe/London (UTC+1)
- Languages: Python, Go, JavaScript, Bash, English, French
- Insurance: Professional liability insured
- Availability: 2 weeks lead time, 2 projects/month capacity

---

## Support / Hire
If you need a **web/API, mobile, cloud, or red-team** assessment with **tight SLAs and crisp deliverables**, reach out.
I also advise engineering teams on **secure design reviews** and **SDLC hardening**.

---

<!-- Optional GitHub flair below -->
<details>
  <summary>📊 GitHub Stats</summary>

  ![GitHub Streak](https://streak-stats.demolab.com?user=Freespirits&theme=default)
  ![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=Freespirits&layout=compact)
</details>

---

## HackTech Project Overview

This repository also contains a static, multi-page rebuild of the original HackTech experience so it can be deployed directly to [Cloudflare Pages](https://developers.cloudflare.com/pages/) or any static host. The new structure mirrors all of the existing content—Daily Briefing, Breach Archives, Arsenal, and Contact—while separating reusable assets so they can be cached efficiently by Cloudflare's CDN.

### Project structure

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
    css/styles.css            # Shared visual design
    js/matrix.js              # Matrix rain background effect
    js/site.js                # Navigation + lucide bootstrap
    js/briefing.js            # Front-end fetcher for the Cloudflare AI briefing
functions/
  api/briefing.js             # Cloudflare Pages Function proxying Workers AI
```

### Local development

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) if you have not already.
2. Create a `.dev.vars` file in the project root so the local dev server can reach Cloudflare AI:
   ```bash
   cat <<'EOF' > .dev.vars
   CLOUDFLARE_ACCOUNT_ID=e8823131dce5e3dcaedec59bb4f7c093
   CLOUDFLARE_AI_TOKEN=YOUR_TEMP_DEVELOPMENT_TOKEN
   # Optional overrides if you are using a custom AI Gateway or a different model
   # CLOUDFLARE_AI_GATEWAY_ID=my-gateway
   # CLOUDFLARE_AI_BASE_URL=https://gateway.ai.cloudflare.com/v1/ACCOUNT/GATEWAY/workers-ai
   # CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct
   MIDJOURNEY_PROXY_URL=https://your-midjourney-proxy.example.com
   EOF
   ```
   Replace `YOUR_TEMP_DEVELOPMENT_TOKEN` with a valid API token. The token is read only by Wrangler during local development and should **not** be committed to git.
3. Run the Pages preview with Functions support:
   ```bash
   npx wrangler pages dev public
   ```
4. Open the printed URL in your browser to view the site. The `/api/briefing` route proxies the Cloudflare AI request so your token stays server-side.

### Deploying to Cloudflare Pages

1. Create (or select) a Cloudflare Pages project from the dashboard.
2. Connect the repository, set the **Framework preset** to **None**, and the **Build output directory** to `public`.
3. In the Pages project settings, add the following environment variables under **Functions → Environment variables**:
   - `CLOUDFLARE_ACCOUNT_ID` → `e8823131dce5e3dcaedec59bb4f7c093`
   - `CLOUDFLARE_AI_TOKEN` → (create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens) with the **AI** scope and paste it here)
   - `CLOUDFLARE_AI_GATEWAY_ID` (optional) → Override the default AI Gateway identifier (`my-gateway`).
   - `CLOUDFLARE_AI_BASE_URL` (optional) → Base URL for a [Cloudflare AI Gateway](https://developers.cloudflare.com/workers-ai/ai-gateway/) or alternate endpoint. Leave unset to use the default gateway associated with this project.
   - `CLOUDFLARE_AI_MODEL` (optional) → Workers AI model slug (defaults to `@cf/meta/llama-3.1-8b-instruct`).
   - `MIDJOURNEY_PROXY_URL` → URL of your deployed [midjourney-proxy](https://github.com/novicezk/midjourney-proxy) instance (for example, `https://your-midjourney-proxy.example.com`)
4. Trigger a deploy. Cloudflare will publish every file inside `public` and execute `functions/api/briefing.js` for `/api/briefing` requests.
5. If you prefer deploying from the CLI, run:
   ```bash
   npx wrangler pages deploy public
   ```
   When prompted, select the Pages project you configured above. Wrangler will reuse the environment variables defined in the dashboard.

### Updating integrations

- **Daily Briefing**: The front end calls `/api/briefing`, which in turn invokes Cloudflare's `@cf/meta/llama-3.1-8b-instruct` model via the configured AI Gateway. Adjust the prompt in `functions/api/briefing.js` or point it at a different [Cloudflare AI model](https://developers.cloudflare.com/workers-ai/models/) by changing the endpoint path or gateway configuration.
- **Midjourney deck**: Configure `MIDJOURNEY_PROXY_URL` to point at your Midjourney proxy. Pages Functions expose `/api/midjourney/*` as a CORS-enabled pass-through so the embedded Lobe Midjourney UI can route imagine/upscale calls securely. Hit `/api/midjourney/status` to confirm the proxy is reachable—responses include a summarized payload from `/mj`.
- **Contact form**: Replace `YOUR_UNIQUE_FORMSPREE_ENDPOINT` in `public/contact.html` with the endpoint provided by Formspree (or swap in your preferred provider).

### Notes

- Navigation highlighting is driven by the `data-page` attribute on `<body>`—set this value on any new page for consistent behaviour.
- Lucide icons load from the official CDN; replace with a pinned version if you prefer long-term stability.
- All styling uses the handcrafted CSS in `assets/css/styles.css` so you can tune the cyber aesthetic without editing each page.
