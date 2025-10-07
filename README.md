# HackTech: The Cyber Frontier

This repository contains a static, multi-page version of the original HackTech experience rebuilt so it can be deployed directly or any static host. The new structure mirrors all of the existing content—Daily Briefing, Breach Archives, Arsenal, and Contact—while separating reusable assets so they can be cached efficiently by Cloudflare's CDN.

## Project structure

```
  public/
    index.html                # Landing page
    daily-briefing.html       # AI briefing page powered by Cloudflare Workers 
    chat-console.html         # Dedicated analyst console backed by Workers chat
    ethical-hacking-tutorials.html # Curated training tracks and resources
    breach-archives.html      # Historical case studies
    arsenal.html              # Curated tooling collection
    contact.html              # Secure contact form powered by Pages Functions
  assets/
    css/styles.css          # Shared visual design
    js/matrix.js            # Matrix rain background effect
    js/site.js              # Navigation + lucide bootstrap
    js/briefing.js          # Front-end fetcher for the Cloudflare briefing
functions/
  api/briefing.js           # Cloudflare Pages Function proxying Workers 
