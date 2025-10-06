export const onRequestPost = async ({ request, env }) => {
    try {
        const formData = await request.formData();
        const handle = (formData.get('handle') || '').toString().trim();
        const replyTo = (formData.get('reply_to') || '').toString().trim();
        const message = (formData.get('message') || '').toString().trim();

        if (!message) {
            return createResponse({
                status: 'error',
                message: 'Message content is required.'
            }, 400, request);
        }

        const toEmail = (env.CONTACT_TO_EMAIL || 'hoya282@gmail.com').trim();
        if (!toEmail) {
            return createResponse({
                status: 'error',
                message: 'Contact email destination is not configured.'
            }, 500, request);
        }

        const fromEmail = (env.CONTACT_FROM_EMAIL || 'no-reply@hacktech-contact.pages.dev').trim();
        const fromName = env.CONTACT_FROM_NAME || 'HackTech Contact Form';
        const subjectHandle = handle || 'Unknown Operative';
        const subject = `New HackTech contact from ${subjectHandle}`;

        const plainBody = buildPlainBody({ handle, replyTo, message });
        const htmlBody = buildHtmlBody({ handle, replyTo, message });

        const mailPayload = {
            personalizations: [
                {
                    to: [
                        {
                            email: toEmail,
                        },
                    ],
                },
            ],
            from: {
                email: fromEmail,
                name: fromName,
            },
            subject,
            content: [
                {
                    type: 'text/plain',
                    value: plainBody,
                },
                {
                    type: 'text/html',
                    value: htmlBody,
                },
            ],
        };

        if (replyTo) {
            mailPayload.reply_to = {
                email: replyTo,
            };
        }

        if (handle) {
            mailPayload.personalizations[0].to[0].name = handle;
        }

        const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(mailPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return createResponse({
                status: 'error',
                message: 'Unable to transmit message.',
                detail: errorText,
            }, 502, request);
        }

        return createResponse({
            status: 'success',
            message: 'Transmission complete. We\'ll be in touch soon.',
        }, 200, request);
    } catch (error) {
        return createResponse({
            status: 'error',
            message: 'An unexpected error occurred while processing the request.',
            detail: error instanceof Error ? error.message : String(error),
        }, 500, request);
    }
};

const createResponse = (payload, status, request) => {
    const accept = request.headers.get('accept') || '';
    const headers = new Headers();

    if (accept.includes('text/html')) {
        headers.set('content-type', 'text/html; charset=utf-8');
        return new Response(renderHtmlResponse(payload), {
            status,
            headers,
        });
    }

    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('cache-control', 'no-store');
    return new Response(JSON.stringify(payload, null, 2), {
        status,
        headers,
    });
};

const buildPlainBody = ({ handle, replyTo, message }) => {
    const lines = [];
    lines.push('Incoming secure contact message:');
    lines.push('');
    lines.push(`Handle: ${handle || 'N/A'}`);
    lines.push(`Reply-To: ${replyTo || 'N/A'}`);
    lines.push('');
    lines.push('Message:');
    lines.push(message);
    lines.push('');
    lines.push(`Received at: ${new Date().toISOString()}`);
    return lines.join('\n');
};

const buildHtmlBody = ({ handle, replyTo, message }) => {
    const escape = (value) =>
        value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const safeHandle = handle ? escape(handle) : 'N/A';
    const safeReplyTo = replyTo ? escape(replyTo) : 'N/A';
    const safeMessage = message ? escape(message).replace(/\n/g, '<br>') : '';

    return `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #0b0f1a; color: #f4f4f5; padding: 16px;">
    <h2 style="margin-top: 0; color: #64f4ac;">HackTech secure contact message</h2>
    <p><strong>Handle:</strong> ${safeHandle}</p>
    <p><strong>Reply-To:</strong> ${safeReplyTo}</p>
    <p><strong>Message</strong></p>
    <div style="padding: 12px; background: rgba(100, 244, 172, 0.08); border-radius: 8px; line-height: 1.5; white-space: pre-wrap;">${safeMessage}</div>
    <p style="margin-top: 24px; font-size: 0.875rem; color: rgba(244, 244, 245, 0.7);">Received at ${new Date().toISOString()}</p>
  </body>
</html>`;
};

const renderHtmlResponse = (payload) => {
    const title = payload.status === 'success' ? 'Transmission Complete' : 'Transmission Error';
    const accentColor = payload.status === 'success' ? '#64f4ac' : '#ff6b6b';

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: 'Inter', system-ui, sans-serif; background: #05060f; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
      .panel { background: rgba(10, 15, 34, 0.95); border: 1px solid rgba(100, 244, 172, 0.25); border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; box-shadow: 0 20px 60px rgba(5, 6, 15, 0.75); }
      h1 { margin-top: 0; color: ${accentColor}; font-size: 1.75rem; }
      p { line-height: 1.6; margin: 0 0 1rem 0; }
      a { color: ${accentColor}; text-decoration: none; }
      button { margin-top: 8px; background: ${accentColor}; color: #05060f; border: none; border-radius: 8px; padding: 0.75rem 1.5rem; font-weight: 700; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="panel">
      <h1>${title}</h1>
      <p>${payload.message || 'No additional details provided.'}</p>
      ${payload.status === 'success' ? '<p>Return to <a href="/contact.html">Contact console</a>.</p>' : ''}
      <button type="button" onclick="history.back()">Go Back</button>
    </div>
  </body>
</html>`;
};
