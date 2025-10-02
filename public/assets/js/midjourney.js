const statusContainer = document.querySelector('[data-midjourney-status]');

if (statusContainer) {
    const indicator = statusContainer.querySelector('[data-status-indicator]');
    const statusText = statusContainer.querySelector('[data-status-text]');
    const statusDetails = statusContainer.querySelector('[data-status-details]');
    const refreshButton = statusContainer.querySelector('[data-status-refresh]');

    const renderState = (state, { message, details, upstream } = {}) => {
        statusContainer.dataset.state = state;

        if (indicator) {
            indicator.dataset.state = state;
        }

        if (statusText) {
            statusText.textContent = message ?? '';
        }

        if (statusDetails) {
            let detailText = '';
            if (upstream) {
                try {
                    detailText = JSON.stringify(upstream, null, 2);
                } catch (error) {
                    detailText = String(upstream);
                }
            } else if (details) {
                detailText = details;
            }

            statusDetails.hidden = !detailText;
            statusDetails.textContent = detailText;
        }
    };

    const setLoading = () => {
        renderState('loading', { message: 'Checking proxy status…' });
    };

    const setSuccess = (payload) => {
        const message = payload.message ?? 'Midjourney proxy is online.';
        renderState('connected', {
            message,
            details: payload.message && !payload.upstream ? payload.message : undefined,
            upstream: payload.upstream,
        });
    };

    const setError = (error) => {
        const message = error?.message ?? error?.error ?? 'Unable to contact the Midjourney proxy.';
        const details = error?.details ?? error?.error;
        renderState('error', { message, details });
    };

    const fetchStatus = async () => {
        setLoading();
        try {
            const response = await fetch('/api/midjourney/status', {
                headers: { Accept: 'application/json' },
            });

            let payload;
            try {
                payload = await response.clone().json();
            } catch {
                const fallback = await response.text();
                payload = {
                    ok: false,
                    message: fallback || 'Midjourney proxy returned a non-JSON response.',
                };
            }

            if (response.ok && payload.ok) {
                setSuccess(payload);
            } else {
                setError({
                    message: payload.error ?? payload.message ?? 'Midjourney proxy is offline.',
                    details: payload.message,
                });
            }
        } catch (error) {
            setError({ message: error.message });
        }
    };

    if (refreshButton) {
        refreshButton.addEventListener('click', (event) => {
            event.preventDefault();
            fetchStatus();
        });
    }

    fetchStatus();
}
