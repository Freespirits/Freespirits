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

function enhanceSiteTitles() {
    const titles = document.querySelectorAll('.site-title');

    titles.forEach((title) => {
        if (title.dataset.enhanced === 'true') {
            return;
        }

        const rawText = (title.textContent || '').trim();
        if (!rawText) {
            return;
        }

        const words = rawText.split(/\s+/);
        const fragment = document.createDocumentFragment();

        words.forEach((word, wordIndex) => {
            const wordWrapper = document.createElement('span');
            wordWrapper.className = 'site-title__word';

            Array.from(word).forEach((char, charIndex) => {
                const charWrapper = document.createElement('span');
                charWrapper.className = 'site-title__char';
                charWrapper.textContent = char;
                charWrapper.style.setProperty('--char-index', String(charIndex));
                charWrapper.style.setProperty('--wire-word-shift', `${wordIndex * 18}deg`);
                wordWrapper.appendChild(charWrapper);
            });

            fragment.appendChild(wordWrapper);

            if (wordIndex < words.length - 1) {
                const spaceWrapper = document.createElement('span');
                spaceWrapper.className = 'site-title__space';
                spaceWrapper.textContent = '\u00a0';
                fragment.appendChild(spaceWrapper);
            }
        });

        title.dataset.enhanced = 'true';
        title.setAttribute('aria-label', rawText);
        title.textContent = '';
        title.appendChild(fragment);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    enhanceSiteTitles();
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
