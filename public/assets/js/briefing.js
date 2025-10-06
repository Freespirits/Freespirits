const fallbackBriefings = [
    {
        generatedAt: '2024-03-18T08:00:00Z',
        markdown: `### Recent Data Breaches\n* **Change Healthcare** disclosed that ransomware actors used a stolen Citrix account to drop "Hello Kitty" (FiveHands) payloads, disrupting pharmacy services across the United States. The company is rotating credentials, hardening remote access, and coordinating with CISA on shared indicators.\n### New Tools & Exploits\n* **Burp Suite 2024.1** introduced a passive API discovery add-on that maps undocumented endpoints and flags unsafe CORS rules—ideal for purple-team reviews.\n### Platform Updates\n* **Kali Linux 2024.1** refreshed its Kernel to 6.6 and added the open-source AutoRecon 2 framework to the default repositories, accelerating service enumeration workflows.`,
    },
    {
        generatedAt: '2024-03-26T08:00:00Z',
        markdown: `### Recent Data Breaches\n* **UnitedHealth Group** confirmed follow-on data theft from the same ALPHV affiliate that hit Change Healthcare. Investigators report exfiltration of claims data; credential resets and segmented network monitoring are underway.\n### New Tools & Exploits\n* **ProjectDiscovery released nuclei-templates v9.8.0**, bundling checks for Ivanti Connect Secure command-injection CVEs (2024-21887/21893) and Atlassian Confluence auth bypasses—deployable in defensive watchlists.\n### Platform Updates\n* **Parrot OS 6.1** shipped a hardened Firefox ESR build and refreshed AppArmor profiles, reducing noise when running blue-team forensic utilities.`,
    },
    {
        generatedAt: '2024-04-02T08:00:00Z',
        markdown: `### Recent Data Breaches\n* **Fujitsu** reported a corporate network intrusion attributed to a credential-stuffing campaign abusing recycled VPN passwords. Impacted employees underwent forced resets and FIDO2 rollouts.\n### New Tools & Exploits\n* **CISA's RedEye 3.0** now parses Cobalt Strike beacon logs and can auto-generate containment runbooks—perfect for blue-team rehearsals.\n### Platform Updates\n* **BlackArch 2024.03.01** added 150+ new packages, including Kerbrute 2.0 and updated bloodhound.py, tightening support for Active Directory attack emulation.`,
    },
];

function selectFallbackBriefing() {
    if (!Array.isArray(fallbackBriefings) || fallbackBriefings.length === 0) {
        return null;
    }

    const today = new Date();
    const index = Math.abs(today.getUTCDate() + today.getUTCMonth()) % fallbackBriefings.length;
    return fallbackBriefings[index];
}

function renderFallbackBriefing(error) {
    console.warn('Using fallback briefing due to live feed error:', error);
    const fallback = selectFallbackBriefing();

    if (!fallback) {
        renderError('Could not connect to the intelligence grid. Check the console for details.');
        return;
    }

    renderBriefing(fallback.markdown, fallback.generatedAt, { isFallback: true });
}

async function fetchDailyBriefing() {
    try {
        const response = await fetch('/api/briefing');

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const payload = await response.json();

        if (payload?.error) {
            throw new Error(payload.error);
        }

        if (typeof payload?.markdown === 'string') {
            renderBriefing(payload.markdown, payload.generatedAt);
        } else {
            throw new Error('Malformed response payload');
        }
    } catch (error) {
        console.error('Error fetching daily briefing:', error);
        renderFallbackBriefing(error);
    }
}

function escapeHtml(value) {
    if (value == null) {
        return '';
    }

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };

    return String(value).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

function renderBriefing(rawText, generatedAt, options = {}) {
    const { isFallback = false } = options;
    const container = document.getElementById('briefing-content');
    if (!container) return;

    const escapedText = escapeHtml(rawText);

    const htmlContent = escapedText
        .replace(/### (.*)/g, '<span class="highlight-heading font-mono">&gt;&gt; $1</span>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-strong">$1</strong>')
        .replace(/\* ([^*]+)/g, '<p class="briefing-paragraph">$1</p>')
        .replace(/\n/g, '<br>');

    const metaBlock = [
        '<div class="briefing-meta font-mono">',
        '<span class="meta-pill">Automated refresh every 2 hours</span>',
        generatedAt ? `<span class="meta-timestamp">Last updated: ${formatTimestamp(generatedAt)}</span>` : '',
        '</div>',
    ].join('');

    const fallbackNotice = isFallback
        ? '<p class="fallback-notice">Live feed temporarily offline — displaying a curated training briefing instead.</p>'
        : '';

    container.innerHTML = `<div class="data-card">${metaBlock}${htmlContent}${fallbackNotice}</div>`;
}

function renderError(message) {
    const container = document.getElementById('briefing-content');
    if (container) {
        container.innerHTML = `<p class="font-mono" style="color: #f87171; text-align: center;">${message}</p>`;
    }
}

function formatTimestamp(isoString) {
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return isoString;
        }

        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    } catch (error) {
        console.warn('Unable to format timestamp:', error);
        return isoString;
    }
}

document.addEventListener('DOMContentLoaded', fetchDailyBriefing);
