async function fetchDailyBriefing() {
    try {
        const response = await fetch('/api/briefing');

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const payload = await response.json();

        if (payload?.markdown) {
            renderBriefing(payload.markdown, payload.generatedAt);
        } else {
            throw new Error('Malformed response payload');
        }
    } catch (error) {
        console.error('Error fetching daily briefing:', error);
        renderError('Could not connect to the intelligence grid. Check the console for details.');
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

function renderBriefing(rawText, generatedAt) {
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

    container.innerHTML = `<div class="data-card">${metaBlock}${htmlContent}</div>`;
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
