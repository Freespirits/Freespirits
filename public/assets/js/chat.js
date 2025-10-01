const statusStyles = {
    idle: {
        color: 'rgba(148, 163, 184, 0.6)',
        glow: '0 0 10px rgba(148, 163, 184, 0.4)',
        label: 'Standing by',
    },
    listening: {
        color: 'var(--color-neon-primary)',
        glow: '0 0 12px rgba(0, 255, 136, 0.6)',
        label: 'Listening',
    },
    responding: {
        color: 'rgba(59, 130, 246, 0.8)',
        glow: '0 0 12px rgba(59, 130, 246, 0.6)',
        label: 'Transmitting reply',
    },
};

const responseTemplates = [
    (msg) => `Copy that. Flagging your intel — "${msg}" — for the watch floor. Anything else on your radar?`,
    (msg) => `Appreciate the drop. I'll correlate "${msg}" against the breach ledger and report back if it pings.`,
    (msg) => `Received your feed: "${msg}". Suggest pairing it with multi-factor hardening before the next shift.`,
    (msg) => `Noted. I'll brief the night crew about "${msg}" once the next rotation boots up.`,
    (msg) => `Your update "${msg}" threads nicely with the ongoing recon. Keep the packets coming.`,
];

const formatTimestamp = (date = new Date()) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const craftResponse = (userMessage) => {
    const sanitized = userMessage.replace(/\s+/g, ' ').trim();
    const template = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
    return template(sanitized);
};

export const initActiveChat = () => {
    const chatShell = document.querySelector('[data-chat-shell]');
    if (!chatShell) {
        return;
    }

    const chatForm = chatShell.querySelector('#activeChatForm');
    const chatInput = chatShell.querySelector('#activeChatInput');
    const chatLog = chatShell.querySelector('#activeChatLog');
    const chatReset = chatShell.querySelector('#activeChatReset');
    const statusIndicator = chatShell.querySelector('[data-chat-status-indicator]');
    const statusText = chatShell.querySelector('[data-chat-status-text]');

    if (!chatForm || !chatInput || !chatLog) {
        return;
    }

    let pendingResponseTimeout = null;

    const setStatus = (mode, message) => {
        const config = statusStyles[mode];
        if (!config) {
            return;
        }

        if (statusIndicator) {
            statusIndicator.style.background = config.color;
            statusIndicator.style.boxShadow = config.glow;
        }

        if (statusText) {
            statusText.textContent = message ?? config.label;
        }
    };

    const addMessage = (role, text) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('chat-message');

        if (role === 'user') {
            wrapper.classList.add('chat-message--user');
        } else if (role === 'ally') {
            wrapper.classList.add('chat-message--ally');
        } else {
            wrapper.classList.add('chat-message--system');
        }

        const author = document.createElement('span');
        author.className = 'chat-author';
        if (role === 'user') {
            author.textContent = 'You';
        } else if (role === 'ally') {
            author.textContent = 'Operative Lynx';
        } else {
            author.textContent = 'System';
        }

        const messageBody = document.createElement('p');
        messageBody.textContent = text;

        const timeStamp = document.createElement('time');
        const now = new Date();
        timeStamp.setAttribute('datetime', now.toISOString());
        timeStamp.textContent = formatTimestamp(now);

        wrapper.append(author, messageBody, timeStamp);
        chatLog.append(wrapper);
        chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });
    };

    const queueResponse = (message) => {
        if (pendingResponseTimeout) {
            clearTimeout(pendingResponseTimeout);
        }

        setStatus('responding', 'Processing intel...');
        pendingResponseTimeout = window.setTimeout(() => {
            addMessage('ally', craftResponse(message));
            setStatus('idle');
            pendingResponseTimeout = null;
        }, 900 + Math.random() * 1400);
    };

    const resetChat = () => {
        chatLog.innerHTML = '';
        addMessage('system', 'Channel secured. Introduce yourself and drop the sharpest intel you have.');
        setStatus('idle');
    };

    chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = chatInput.value.trim();
        if (!message) {
            return;
        }

        addMessage('user', message);
        chatInput.value = '';
        chatInput.focus();
        queueResponse(message);
    });

    chatInput.addEventListener('focus', () => setStatus('listening', 'Monitoring input...'));
    chatInput.addEventListener('blur', () => setStatus('idle'));

    if (chatReset) {
        chatReset.addEventListener('click', () => {
            if (pendingResponseTimeout) {
                clearTimeout(pendingResponseTimeout);
                pendingResponseTimeout = null;
            }
            resetChat();
        });
    }

    resetChat();
};
