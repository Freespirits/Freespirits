const statusContainer = document.querySelector('[data-midjourney-status]');

if (statusContainer) {
    const indicator = statusContainer.querySelector('[data-status-indicator]');
    const statusText = statusContainer.querySelector('[data-status-text]');
    const statusDetails = statusContainer.querySelector('[data-status-details]');
    const refreshButton = statusContainer.querySelector('[data-status-refresh]');
    const statusTimestamp = statusContainer.querySelector('[data-status-timestamp]');
    const statusLatency = statusContainer.querySelector('[data-status-latency]');
    const statusHistoryList = statusContainer.querySelector('[data-status-history]');

    const HISTORY_LIMIT = 6;
    const POLL_INTERVAL = 30000;
    const history = [];
    let pollTimer = null;

    const scheduleNextPoll = () => {
        if (pollTimer) {
            clearTimeout(pollTimer);
        }
        pollTimer = setTimeout(fetchStatus, POLL_INTERVAL);
    };

    const formatTimestamp = (value) => {
        if (!value) {
            return 'Unknown check time';
        }

        try {
            const date = value instanceof Date ? value : new Date(value);
            return `Checked ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        } catch (error) {
            console.warn('Unable to format timestamp', error);
            return `Checked ${value}`;
        }
    };

    const formatLatency = (value) => {
        if (typeof value !== 'number') {
            return null;
        }

        if (value >= 1000) {
            return `${(value / 1000).toFixed(2)}s latency`;
        }

        return `${Math.round(value)}ms latency`;
    };

    const renderHistory = () => {
        if (!statusHistoryList) {
            return;
        }

        statusHistoryList.innerHTML = '';

        if (history.length === 0) {
            statusHistoryList.hidden = true;
            return;
        }

        const fragment = document.createDocumentFragment();
        history.forEach((entry) => {
            const item = document.createElement('li');
            item.dataset.state = entry.state;
            const timestamp = formatTimestamp(entry.checkedAt);
            const latency = formatLatency(entry.responseTimeMs);
            const parts = [timestamp];
            if (entry.upstreamStatus) {
                parts.push(`HTTP ${entry.upstreamStatus}`);
            }
            if (latency) {
                parts.push(latency);
            }
            if (entry.message) {
                parts.push(entry.message);
            }
            item.textContent = parts.join(' • ');
            fragment.appendChild(item);
        });

        statusHistoryList.appendChild(fragment);
        statusHistoryList.hidden = false;
    };

    const recordHistory = (state, payload = {}) => {
        history.unshift({
            state,
            checkedAt: payload.checkedAt ?? new Date(),
            responseTimeMs: payload.responseTimeMs,
            message: payload.message || payload.error,
            upstreamStatus: payload.upstreamStatus,
        });

        if (history.length > HISTORY_LIMIT) {
            history.length = HISTORY_LIMIT;
        }

        renderHistory();
    };

    const renderMeta = ({ checkedAt, responseTimeMs } = {}) => {
        if (statusTimestamp) {
            statusTimestamp.textContent = formatTimestamp(checkedAt ?? new Date());
        }

        if (statusLatency) {
            const latency = formatLatency(responseTimeMs);
            statusLatency.textContent = latency ?? '';
            statusLatency.hidden = !latency;
        }
    };

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
        if (statusLatency) {
            statusLatency.hidden = true;
        }
        if (statusTimestamp) {
            statusTimestamp.textContent = 'Running live check…';
        }
    };

    const setSuccess = (payload) => {
        const message = payload.message ?? 'Midjourney proxy is online.';
        renderState('connected', {
            message,
            details: payload.message && !payload.upstream ? payload.message : undefined,
            upstream: payload.upstream,
        });
        renderMeta(payload);
        recordHistory('connected', { ...payload, message });
    };

    const setError = (error) => {
        const message = error?.message ?? error?.error ?? 'Unable to contact the Midjourney proxy.';
        const details = error?.details ?? error?.error;
        renderState('error', { message, details });
        renderMeta(error);
        recordHistory('error', { ...error, message });
    };

    const fetchStatus = async () => {
        if (pollTimer) {
            clearTimeout(pollTimer);
        }
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
                    checkedAt: payload.checkedAt,
                    responseTimeMs: payload.responseTimeMs,
                    upstreamStatus: payload.upstreamStatus,
                });
            }
        } catch (error) {
            setError({ message: error.message, checkedAt: new Date().toISOString() });
        }

        scheduleNextPoll();
    };

    if (refreshButton) {
        refreshButton.addEventListener('click', (event) => {
            event.preventDefault();
            fetchStatus();
        });
    }

    fetchStatus();
}
