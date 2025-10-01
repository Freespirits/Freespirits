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
        label: 'Routing reply',
    },
};

const HISTORY_LIMIT = 12;

const formatTimestamp = (date = new Date()) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const initActiveChat = () => {
    const chatShell = document.querySelector('[data-chat-shell]');
    if (!chatShell) {
        return;
    }

    const chatForm = chatShell.querySelector('#activeChatForm');
    const chatInput = chatShell.querySelector('#activeChatInput');
    const chatLog = chatShell.querySelector('#activeChatLog');
    const chatReset = chatShell.querySelector('#activeChatReset');
    const chatSendButton = chatShell.querySelector('.chat-send');
    const statusIndicator = chatShell.querySelector('[data-chat-status-indicator]');
    const statusText = chatShell.querySelector('[data-chat-status-text]');

    if (!chatForm || !chatInput || !chatLog) {
        return;
    }

    const conversation = [];
    let isAwaitingReply = false;

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

    const trimHistory = () => {
        while (conversation.length > HISTORY_LIMIT) {
            conversation.shift();
        }
    };

    const toggleInputState = (disabled) => {
        chatInput.disabled = disabled;
        if (chatSendButton) {
            chatSendButton.disabled = disabled;
            if (disabled) {
                chatSendButton.setAttribute('aria-disabled', 'true');
            } else {
                chatSendButton.removeAttribute('aria-disabled');
            }
        }

        if (!disabled) {
            chatInput.focus();
        }
    };

    const requestReply = async () => {
        if (isAwaitingReply || conversation.length === 0) {
            return;
        }

        isAwaitingReply = true;
        setStatus('responding', 'Routing to Operative Lynx...');
        toggleInputState(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: conversation }),
            });

            let payload;
            try {
                payload = await response.json();
            } catch (parseError) {
                throw new Error('Unrecognized response from the relay.');
            }

            if (!response.ok) {
                const message =
                    typeof payload?.error === 'string'
                        ? payload.error
                        : `Transmission failed (status ${response.status}).`;
                throw new Error(message);
            }

            const reply = typeof payload?.reply === 'string' ? payload.reply.trim() : '';

            if (!reply) {
                throw new Error('No reply text returned.');
            }

            addMessage('ally', reply);
            conversation.push({ role: 'assistant', content: reply });
            trimHistory();
        } catch (error) {
            console.error('Active chat error:', error);
            const notice =
                error instanceof Error && error.message
                    ? error.message
                    : 'Transmission jammed. Try resubmitting in a moment.';
            addMessage('system', notice);
        } finally {
            isAwaitingReply = false;
            setStatus('idle');
            toggleInputState(false);
        }
    };

    const resetChat = () => {
        chatLog.innerHTML = '';
        conversation.length = 0;
        chatInput.value = '';
        addMessage('system', 'Channel secured. Introduce yourself and drop the sharpest intel you have.');
        const greeting =
            'Operative Lynx online. Keep it concise and let me know what intel needs eyes.';
        addMessage('ally', greeting);
        conversation.push({ role: 'assistant', content: greeting });
        setStatus('idle');
        toggleInputState(false);
        isAwaitingReply = false;
    };

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = chatInput.value.trim();
        if (!message || isAwaitingReply) {
            return;
        }

        addMessage('user', message);
        conversation.push({ role: 'user', content: message });
        trimHistory();
        chatInput.value = '';
        chatInput.focus();
        await requestReply();
    });

    chatInput.addEventListener('focus', () => setStatus('listening', 'Monitoring input...'));
    chatInput.addEventListener('blur', () => setStatus('idle'));

    if (chatReset) {
        chatReset.addEventListener('click', () => {
            resetChat();
        });
    }

    resetChat();
};
