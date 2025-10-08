const ARCHIVED_BRIEFINGS = Object.freeze([
    {
        generatedAt: '2024-03-18T08:00:00Z',
        markdown:
            '### Recent Data Breaches\n* **Change Healthcare** disclosed that ransomware actors used a stolen Citrix account to drop "Hello Kitty" (FiveHands) payloads, disrupting pharmacy services across the United States. The company is rotating credentials, hardening remote access, and coordinating with CISA on shared indicators.\n### New Tools & Exploits\n* **Burp Suite 2024.1** introduced a passive API discovery add-on that maps undocumented endpoints and flags unsafe CORS rules—ideal for purple-team reviews.\n### Platform Updates\n* **Kali Linux 2024.1** refreshed its Kernel to 6.6 and added the open-source AutoRecon 2 framework to the default repositories, accelerating service enumeration workflows.',
    },
    {
        generatedAt: '2024-03-26T08:00:00Z',
        markdown:
            '### Recent Data Breaches\n* **UnitedHealth Group** confirmed follow-on data theft from the same ALPHV affiliate that hit Change Healthcare. Investigators report exfiltration of claims data; credential resets and segmented network monitoring are underway.\n### New Tools & Exploits\n* **ProjectDiscovery released nuclei-templates v9.8.0**, bundling checks for Ivanti Connect Secure command-injection CVEs (2024-21887/21893) and Atlassian Confluence auth bypasses—deployable in defensive watchlists.\n### Platform Updates\n* **Parrot OS 6.1** shipped a hardened Firefox ESR build and refreshed AppArmor profiles, reducing noise when running blue-team forensic utilities.',
    },
    {
        generatedAt: '2024-04-02T08:00:00Z',
        markdown:
            '### Recent Data Breaches\n* **Fujitsu** reported a corporate network intrusion attributed to a credential-stuffing campaign abusing recycled VPN passwords. Impacted employees underwent forced resets and FIDO2 rollouts.\n### New Tools & Exploits\n* **CISA\'s RedEye 3.0** now parses Cobalt Strike beacon logs and can auto-generate containment runbooks—perfect for blue-team rehearsals.\n### Platform Updates\n* **BlackArch 2024.03.01** added 150+ new packages, including Kerbrute 2.0 and updated bloodhound.py, tightening support for Active Directory attack emulation.',
    },
    {
        generatedAt: '2024-04-18T08:00:00Z',
        markdown:
            '### Recent Data Breaches\n* **London Clinic Pegasus inquiry**: UK regulators disclosed that infrastructure tied to NSO Group\'s Pegasus spyware was used to surveil lawyers working the Post Office Horizon case. Mobile carriers rotated IMSI catchers, while the victims replaced handsets and deployed mobile EDR.\n### New Tools & Exploits\n* **Velociraptor 0.7.1** shipped enterprise-ready remote collection with granular RBAC, giving responders a sanctioned alternative to commodity RAT tooling when investigating lateral movement.\n### Platform Updates\n* **Microsoft Entra ID** added granular continuous access evaluation logs for Remote Desktop Protocol (RDP) sign-ins, closing blind spots defenders saw during the Storm-1811 social-engineering spree.',
    },
]);

function selectArchivedBriefing() {
    if (!Array.isArray(ARCHIVED_BRIEFINGS) || ARCHIVED_BRIEFINGS.length === 0) {
        return null;
    }

    const today = new Date();
    const index = Math.abs(today.getUTCDate() + today.getUTCMonth()) % ARCHIVED_BRIEFINGS.length;
    return ARCHIVED_BRIEFINGS[index];
}

export async function onRequestGet(context) {
    const { request, waitUntil } = context;
    const cache = caches.default;
    const cacheKey = new Request(request);

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const archived = selectArchivedBriefing();
        if (!archived) {
            throw new Error('No archived briefings are available.');
        }

        const responseBody = JSON.stringify({
            markdown: archived.markdown,
            generatedAt: archived.generatedAt,
            notice: 'Live Cloudflare Workers AI feed retired — serving archived training briefings.',
        });

        const response = new Response(responseBody, {
            headers: {
                'content-type': 'application/json',
                'cache-control': 'public, max-age=0, s-maxage=7200',
            },
        });

        if (typeof waitUntil === 'function') {
            waitUntil(cache.put(cacheKey, response.clone()));
        } else {
            await cache.put(cacheKey, response.clone());
        }

        return response;
    } catch (error) {
        console.error('Daily briefing function error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to load archived briefing. Check server logs for details.' }),
            {
                status: 500,
                headers: { 'content-type': 'application/json' },
            }
        );
    }
}
