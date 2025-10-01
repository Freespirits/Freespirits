import { startMatrixRain } from './matrix.js';
import { initActiveChat } from './chat.js';

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

    if (document.querySelector('[data-chat-shell]')) {
        initActiveChat();
    }
});
