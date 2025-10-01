const PROVIDER_STORAGE_KEY = 'hacktech-ai-provider';
const PROVIDER_COPY = {
    cloudflare: 'Cloudflare Workers AI (Meta Llama 3 8B Instruct)',
    huggingface: 'Hugging Face Inference (Mistral 7B Instruct)',
};

async function fetchDailyBriefing(provider) {
    const activeProvider = provider || getSelectedProvider();

    try {
        const response = await fetch(`/api/briefing?provider=${encodeURIComponent(activeProvider)}`);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const payload = await response.json();

        if (payload?.markdown) {
            renderBriefing(payload.markdown);
            updateProviderLabel(payload.provider || activeProvider);
        } else {
            throw new Error('Malformed response payload');
        }
    } catch (error) {
        console.error('Error fetching daily briefing:', error);
        updateProviderLabel(activeProvider);
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

function renderLoading() {
    const container = document.getElementById('briefing-content');
    if (!container) return;

    container.innerHTML = `
        <p>Routing request through the mesh...</p>
        <div class="loading-dots" style="justify-content: center; margin-top: 1.5rem;">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
}

function updateProviderLabel(provider) {
    const providerLabel = document.getElementById('active-provider');
    if (!providerLabel) return;

    providerLabel.textContent = PROVIDER_COPY[provider] || provider;
}

function getSelectedProvider() {
    const selector = document.getElementById('ai-provider');
    return selector?.value || 'cloudflare';
}

function hydrateProviderSelector() {
    const selector = document.getElementById('ai-provider');
    if (!selector) return;

    const savedProvider = readStoredProvider();
    if (savedProvider && PROVIDER_COPY[savedProvider]) {
        selector.value = savedProvider;
    }

    updateProviderLabel(selector.value);

    selector.addEventListener('change', () => {
        const nextProvider = selector.value;
        writeStoredProvider(nextProvider);
        updateProviderLabel(nextProvider);
        renderLoading();
        fetchDailyBriefing(nextProvider);
    });
}

function readStoredProvider() {
    try {
        return localStorage.getItem(PROVIDER_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to read stored AI provider preference:', error);
        return null;
    }
}

function writeStoredProvider(value) {
    try {
        localStorage.setItem(PROVIDER_STORAGE_KEY, value);
    } catch (error) {
        console.warn('Unable to persist AI provider preference:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    hydrateProviderSelector();
    renderLoading();
    fetchDailyBriefing();
});
