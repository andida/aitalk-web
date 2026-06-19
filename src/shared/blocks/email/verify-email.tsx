type VerifyEmailOptions = {
  appName?: string;
  logoUrl?: string;
  url: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function renderVerifyEmailText({
  appName = 'our app',
  url,
}: VerifyEmailOptions) {
  return [
    `Verify your email for ${appName}`,
    '',
    `Click this link to verify your email address and finish signing in to ${appName}:`,
    url,
    '',
    'This link will expire in 24 hours.',
    "If you didn't request this email, you can safely ignore it.",
  ].join('\n');
}

export function renderVerifyEmailHtml({
  appName = 'our app',
  logoUrl,
  url,
}: VerifyEmailOptions) {
  const safeAppName = escapeHtml(appName);
  const safeUrl = escapeAttribute(url);
  const logo = logoUrl
    ? `<img src="${escapeAttribute(logoUrl)}" width="40" height="40" alt="${safeAppName}" style="border-radius:10px;border:1px solid rgba(15,23,42,0.10);background-color:rgba(15,23,42,0.03);display:block;" />`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your email for ${safeAppName}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">Verify your email for ${safeAppName}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f9fc;">
      <tr>
        <td align="center" style="padding:32px 16px 40px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;border:1px solid rgba(15,23,42,0.08);box-shadow:0 20px 50px rgba(2,6,23,0.10),0 2px 8px rgba(2,6,23,0.05);">
            <tr>
              <td style="padding:28px 24px;">
                <div style="height:6px;border-radius:999px;margin-bottom:18px;background:linear-gradient(90deg,rgba(99,102,241,1) 0%,rgba(236,72,153,1) 55%,rgba(14,165,233,1) 100%);"></div>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                  <tr>
                    ${logo ? `<td style="padding-right:10px;">${logo}</td>` : ''}
                    <td style="font-size:14px;line-height:18px;font-weight:600;color:#0f172a;">${safeAppName}</td>
                  </tr>
                </table>
                <h1 style="margin:0 0 10px;font-size:24px;line-height:30px;font-weight:700;">Verify your email</h1>
                <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#334155;">Click the button below to verify your email address and finish signing in to <strong>${safeAppName}</strong>.</p>
                <div style="text-align:center;margin:18px 0 14px;">
                  <a href="${safeUrl}" style="background-color:#111827;border-radius:12px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 18px;display:inline-block;">Verify email</a>
                </div>
                <p style="margin:0 0 10px;font-size:12px;line-height:18px;color:#64748b;text-align:center;">This link will expire in <strong>24 hours</strong>.</p>
                <hr style="border:none;border-top:1px solid rgba(15,23,42,0.08);margin:18px 0;" />
                <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
                <a href="${safeUrl}" style="font-size:12px;line-height:18px;color:#2563eb;word-break:break-all;">${escapeHtml(url)}</a>
                <p style="margin:18px 0 0;font-size:12px;line-height:18px;color:#94a3b8;">If you didn't request this email, you can safely ignore it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
