async function fetchDailyBriefing() {
    try {
        const response = await fetch('/api/briefing');

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const payload = await response.json();

        if (payload?.markdown) {
            renderBriefing(payload.markdown);
        } else {
            throw new Error('Malformed response payload');
        }
    } catch (error) {
        console.error('Error fetching daily briefing:', error);
        renderError('Could not connect to the intelligence grid. Check the console for details.');
    }
}

function renderBriefing(rawText) {
    const container = document.getElementById('briefing-content');
    if (!container) return;

    const htmlContent = rawText
        .replace(/### (.*)/g, '<span class="highlight-heading font-mono">&gt;&gt; $1</span>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-strong">$1</strong>')
        .replace(/\* ([^*]+)/g, '<p class="briefing-paragraph">$1</p>')
        .replace(/\n/g, '<br>');

    container.innerHTML = `<div class="data-card">${htmlContent}</div>`;
}

function renderError(message) {
    const container = document.getElementById('briefing-content');
    if (container) {
        container.innerHTML = `<p class="font-mono" style="color: #f87171; text-align: center;">${message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', fetchDailyBriefing);
