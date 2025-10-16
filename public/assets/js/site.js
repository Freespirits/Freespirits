import { startMatrixRain } from './matrix.js';

const readableModeStorageKey = 'hacktech-readable-mode';

function applyReadableMode(isEnabled) {
    document.body.classList.toggle('readable-mode', isEnabled);

    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) {
        return;
    }

    toggle.setAttribute('aria-pressed', String(isEnabled));

    const label = toggle.querySelector('[data-theme-toggle-label]');
    if (label) {
        label.textContent = `Accessibility Mode: ${isEnabled ? 'On' : 'Off'}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startMatrixRain();
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }

    const activePage = document.body.dataset.page;
    const links = document.querySelectorAll('[data-nav-link]');

    links.forEach((link) => {
        if (link.dataset.pageTarget === activePage) {
            link.classList.add('active');
        }
    });

    let storedPreference = null;
    try {
        storedPreference = localStorage.getItem(readableModeStorageKey);
    } catch (error) {
        console.warn('Unable to read accessibility preference from storage:', error);
    }

    const prefersReadableMode = storedPreference === 'true';
    applyReadableMode(prefersReadableMode);

    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const currentlyEnabled = document.body.classList.contains('readable-mode');
            const nextState = !currentlyEnabled;
            applyReadableMode(nextState);
            try {
                localStorage.setItem(readableModeStorageKey, String(nextState));
            } catch (error) {
                console.warn('Unable to persist accessibility preference:', error);
            }
        });
    }
});
