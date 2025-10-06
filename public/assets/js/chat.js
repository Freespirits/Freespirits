const systemMessage = {
    role: 'system',
    content:
        'You are a world-class cybersecurity analyst supporting HackTech operators across briefings and training missions. Provide concise, technically accurate insights, emphasize lawful defensive actions, and suggest next steps when helpful.',
};

const conversation = [systemMessage];
const MAX_HISTORY = 14;

function extractReply(payload) {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload.trim();
    }

    if (typeof payload !== 'object') {
        return '';
    }

    const directReply = payload.reply;
    if (typeof directReply === 'string' && directReply.trim()) {
        return directReply.trim();
    }

    const containers = [payload, payload?.result];

    for (const container of containers) {
        if (!container) {
            continue;
        }

        if (typeof container === 'string') {
            const trimmed = container.trim();
            if (trimmed) {
                return trimmed;
            }
            continue;
        }

        if (typeof container !== 'object') {
            continue;
        }

        const directFields = [container.reply, container.response, container.output_text, container.text];
        for (const field of directFields) {
            if (typeof field === 'string' && field.trim()) {
                return field.trim();
            }
        }

        const dataEntry = container.data?.[0];
        if (dataEntry) {
            const dataCandidates = [dataEntry.message?.content, dataEntry.text];
            for (const candidate of dataCandidates) {
                if (typeof candidate === 'string' && candidate.trim()) {
                    return candidate.trim();
                }
            }
        }

        const choice = container.choices?.[0];
        if (choice) {
            const choiceCandidates = [choice.message?.content, choice.text];
            for (const option of choiceCandidates) {
                if (typeof option === 'string' && option.trim()) {
                    return option.trim();
                }
            }
        }
    }

    return '';
}

function snapshotConversation() {
    const recent = conversation.slice(-MAX_HISTORY);
    const hasSystem = recent.some((entry) => entry.role === 'system');
    if (!hasSystem && conversation[0]?.role === 'system') {
        recent.unshift(conversation[0]);
    }
    return recent;
}

function getElements() {
    return {
        thread: document.getElementById('chat-thread'),
        form: document.getElementById('chat-form'),
        input: document.getElementById('chat-input'),
        sendButton: document.querySelector('[data-chat-send]'),
        wrapper: document.querySelector('[data-chat-wrapper]'),
    };
}

function appendMessage(role, content) {
    const { thread } = getElements();
    if (!thread) return null;

    const message = document.createElement('div');
    message.className = 'chat-message';
    message.dataset.role = role;

    const header = document.createElement('header');
    header.textContent = role === 'user' ? 'Operative' : 'Analyst';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = content;

    message.appendChild(header);
    message.appendChild(bubble);
    thread.appendChild(message);
    thread.scrollTop = thread.scrollHeight;
    return message;
}

function createTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'chat-message';
    indicator.dataset.role = 'assistant';
    indicator.dataset.state = 'typing';

    const header = document.createElement('header');
    header.textContent = 'Analyst';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const status = document.createElement('span');
    status.className = 'chat-status';
    status.textContent = 'Synthesizing intel';

    const dots = document.createElement('span');
    dots.className = 'loading-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    status.appendChild(dots);
    bubble.appendChild(status);

    indicator.appendChild(header);
    indicator.appendChild(bubble);
    return indicator;
}

function setBusyState(isBusy) {
    const { sendButton, wrapper, thread } = getElements();
    if (sendButton) {
        sendButton.disabled = isBusy;
    }
    if (wrapper) {
        wrapper.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
    if (thread) {
        thread.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
}

async function transmitMessage(event) {
    event.preventDefault();
    const { input, thread } = getElements();
    if (!input || !thread) {
        return;
    }

    const userMessage = input.value.trim();
    if (!userMessage) {
        return;
    }

    appendMessage('user', userMessage);
    conversation.push({ role: 'user', content: userMessage });
    input.value = '';
    input.style.height = '';

    const typingIndicator = createTypingIndicator();
    thread.appendChild(typingIndicator);
    thread.scrollTop = thread.scrollHeight;

    setBusyState(true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: snapshotConversation() }),
        });

        if (!response.ok) {
            let errorMessage = `Chat API error: ${response.status}`;
            try {
                const errorPayload = await response.clone().json();
                if (typeof errorPayload?.error === 'string' && errorPayload.error.trim()) {
                    errorMessage = errorPayload.error.trim();
                    if (typeof errorPayload.details === 'string' && errorPayload.details.trim()) {
                        errorMessage = `${errorMessage} (${errorPayload.details.trim()})`;
                    }
                }
            } catch (parseError) {
                console.warn('Unable to parse chat error payload:', parseError);
            }

            throw new Error(errorMessage);
        }

        const payload = await response.json();
        const reply = extractReply(payload);

        if (!reply) {
            throw new Error('Empty response from analyst');
        }

        conversation.push({ role: 'assistant', content: reply });
        typingIndicator.remove();
        appendMessage('assistant', reply);
    } catch (error) {
        console.error('Chat console error:', error);
        typingIndicator.remove();
        const reason = error instanceof Error && error.message ? ` (${error.message})` : '';
        appendMessage(
            'assistant',
            `Signal lost while contacting the analyst. Check your connection and try again.${reason}`.trim()
        );
    } finally {
        setBusyState(false);
    }
}

function autoResize(event) {
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement)) {
        return;
    }
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 320)}px`;
}

document.addEventListener('DOMContentLoaded', () => {
    const { form, input } = getElements();
    if (!form || !input) {
        return;
    }

    appendMessage(
        'assistant',
        'Welcome back, operative. I can expand on briefing intel, craft training plans, or outline mitigation steps. What signal should we decode first?'
    );
    conversation.push({
        role: 'assistant',
        content:
            'Welcome back, operative. I can expand on briefing intel, craft training plans, or outline mitigation steps. What signal should we decode first?',
    });

    form.addEventListener('submit', transmitMessage);
    input.addEventListener('input', autoResize);

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });
});
