function renderRetiredBriefing() {
    const container = document.getElementById('briefing-content');
    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="data-card">
            <div class="briefing-meta font-mono">
                <span class="meta-pill">Feed retired</span>
            </div>
            <p class="briefing-paragraph">
                The automated daily briefing is offline and no longer pulls from Cloudflare Workers AI. Explore the tutorials,
                breach archives, and knowledge hub pages for training material instead.
            </p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', renderRetiredBriefing);
