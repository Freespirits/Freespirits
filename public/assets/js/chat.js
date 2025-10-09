function disableChatConsole() {
    const thread = document.getElementById('chat-thread');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const sendButton = document.querySelector('[data-chat-send]');

    if (thread) {
        const message = document.createElement('div');
        message.className = 'chat-message';
        message.dataset.role = 'assistant';

        const header = document.createElement('header');
        header.textContent = 'Analyst';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent =
            'The live analyst console has been retired alongside the Cloudflare Workers AI integration. Review the training materials and briefing archives for guidance.';

        message.appendChild(header);
        message.appendChild(bubble);
        thread.appendChild(message);
    }

    if (input) {
        input.disabled = true;
        input.value = '';
        input.setAttribute('aria-disabled', 'true');
        input.placeholder = 'Analyst console retired.';
    }

    if (sendButton) {
        sendButton.disabled = true;
        sendButton.setAttribute('aria-disabled', 'true');
    }

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
        });
    }
}

document.addEventListener('DOMContentLoaded', disableChatConsole);
