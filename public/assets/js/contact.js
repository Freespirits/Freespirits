const form = document.querySelector('[data-contact-form]');
const statusEl = document.querySelector('[data-contact-status]');

if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!statusEl) {
            console.warn('Contact status element missing. Submission feedback will not be visible.');
        } else {
            statusEl.textContent = 'Transmitting secure packet...';
            statusEl.dataset.state = 'pending';
        }

        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorPayload = await safeParseJson(response);
                throw new Error(errorPayload?.message || `Request failed with status ${response.status}`);
            }

            if (statusEl) {
                statusEl.textContent = 'Transmission successful. Expect a response soon.';
                statusEl.dataset.state = 'success';
            }

            form.reset();
        } catch (error) {
            console.error('Contact form submission failed:', error);
            if (statusEl) {
                statusEl.textContent = error instanceof Error ? error.message : 'Unexpected error sending message.';
                statusEl.dataset.state = 'error';
            } else {
                alert('Unable to send your message. Please try again later.');
            }
        }
    });
}

async function safeParseJson(response) {
    try {
        return await response.clone().json();
    } catch (error) {
        return null;
    }
}
