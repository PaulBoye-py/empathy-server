// utils/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const SUPPORT_EMAILS = process.env.NODE_ENV === 'production'
  ? [
      'estherapyhub@gmail.com',
      // 'asereopeyemimichael@gmail.com',
      'admin@padarlabs.com',
      'paul.adeboye@yahoo.com',
      // 'timiasha7@gmail.com',
      'kunle.ogunsola@gmail.com',
      'drkaf@empathyspaceng.org',
      'info@empathyspaceng.org',
    ]
  : ['paul.adeboye@yahoo.com'];

const ERROR_NOTIFICATION_EMAILS = [
  'paul.adeboye@yahoo.com',
   'admin@padarlabs.com',
  // 'timiasha7@gmail.com',
];

const BRAND = {
  primary: '#6C7826',
  primaryDark: '#4a5218',
  primaryLight: '#F0F4E8',
  text: '#2D2D2D',
  muted: '#6B6B6B',
  border: '#E0E4CC',
  white: '#FFFFFF',
  successBg: '#EBF4EC',
  successText: '#1E5E24',
  failBg: '#FDECEA',
  failText: '#8B1A14',
  warnBg: '#FFF8E6',
  warnText: '#7A4F00',
};

// Work Sans via Google Fonts — best-effort for email clients that support @import
const FONT_STACK = "'Work Sans', Arial, Helvetica, sans-serif";
const GOOGLE_FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap');`;

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  debug: true,
  logger: true,
});

// ─── Shared layout ────────────────────────────────────────────────────────────

const emailHeader = (title, subtitle = '') => `
  <div style="background-color:${BRAND.primary};padding:28px 32px;border-radius:10px 10px 0 0;">
    <img src="https://www.myempathyspace.com/logo.png" alt="EmpathySpace" style="height:36px;margin-bottom:14px;display:block;" onerror="this.style.display='none'"/>
    <h1 style="margin:0;font-family:${FONT_STACK};font-size:20px;color:${BRAND.white};font-weight:700;letter-spacing:-0.3px;">${title}</h1>
    ${subtitle ? `<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.80);font-family:${FONT_STACK};">${subtitle}</p>` : ''}
  </div>
`;

const emailFooter = () => `
  <div style="background-color:${BRAND.primaryLight};padding:20px 32px;border-radius:0 0 10px 10px;border-top:2px solid ${BRAND.border};text-align:center;">
    <p style="margin:0 0 4px;font-family:${FONT_STACK};font-size:13px;font-weight:600;color:${BRAND.primary};">
      EmpathySpace Consulting
    </p>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};font-family:${FONT_STACK};">
      77 Tafawa Balewa Cres, Surulere, Lagos &nbsp;|&nbsp;
      <a href="mailto:info@empathyspaceng.org" style="color:${BRAND.primary};text-decoration:none;">info@empathyspaceng.org</a> &nbsp;|&nbsp;
      <a href="tel:+2349136559988" style="color:${BRAND.primary};text-decoration:none;">0913 655 9988</a>
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:${BRAND.muted};font-family:${FONT_STACK};">
      This is an automated notification. Please do not reply to this email.
    </p>
  </div>
`;

const emailWrapper = (body) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>${GOOGLE_FONT_IMPORT}</style>
  </head>
  <body style="margin:0;padding:20px;background-color:#F5F5F0;font-family:${FONT_STACK};">
    <div style="max-width:640px;margin:0 auto;background:${BRAND.white};border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      ${body}
    </div>
  </body>
  </html>
`;

const infoRow = (label, value) =>
  `<tr>
    <td style="padding:8px 0;color:${BRAND.muted};font-size:13px;font-family:${FONT_STACK};width:40%;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:${BRAND.text};font-size:13px;font-family:${FONT_STACK};font-weight:600;">${value || 'N/A'}</td>
  </tr>`;

const section = (title, rows) => `
  <div style="padding:20px 32px;">
    <h3 style="margin:0 0 12px;font-family:${FONT_STACK};font-size:13px;font-weight:700;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>
`;

const divider = () => `<div style="height:1px;background:${BRAND.border};margin:0 32px;"></div>`;

const sectionHeader = (title, color) => `
  <div style="padding:20px 32px 8px;">
    <h2 style="margin:0;font-family:${FONT_STACK};font-size:15px;font-weight:700;color:${color};border-bottom:2px solid ${color};padding-bottom:8px;display:inline-block;">${title}</h2>
  </div>
`;

// ─── Amount formatter ─────────────────────────────────────────────────────────

const formatAmount = (amount, currency) => {
  if (currency === 'USD') return `$${(amount / 100).toFixed(2)}`;
  return `NGN ${(amount / 100).toLocaleString()}`;
};

// ─── email rate limiting ──────────────────────────────────────────────────────

// A tight retry/poll loop (or a bot) can trigger these dozens of times within
// seconds; without a cap, each call fires a real email, and enough of them in
// a burst gets our Zoho account flagged and blocked (which then breaks
// legitimate mail too). Each guard tracks its own rolling window.
const createEmailRateLimiter = (windowMs, maxPerWindow) => {
  let timestamps = [];
  return () => {
    const now = Date.now();
    timestamps = timestamps.filter(ts => now - ts < windowMs);
    if (timestamps.length >= maxPerWindow) return false;
    timestamps.push(now);
    return true;
  };
};

const canSendErrorNotification = createEmailRateLimiter(5 * 60 * 1000, 5);
// Higher ceiling: this one fires on every real payment, so it needs headroom
// for genuine traffic — it's here to catch a runaway loop, not normal volume.
const canSendPaymentStatusNotification = createEmailRateLimiter(5 * 60 * 1000, 20);

// ─── sendErrorNotification ────────────────────────────────────────────────────

const sendErrorNotification = async (errorType, errorDetails, clientData = null) => {
  try {
    if (!canSendErrorNotification()) {
      console.warn('Suppressing error notification email (rate limit reached)', { errorType });
      return;
    }

    const subject = `System Error — ${errorType} | EmpathySpace`;

    const body = `
      ${emailHeader('System Error Notification', new Date().toLocaleString())}
      <div style="padding:20px 32px;">
        <div style="background:${BRAND.failBg};border-left:4px solid #C62828;padding:14px;border-radius:4px;margin-bottom:16px;">
          <p style="margin:0;font-size:14px;font-family:${FONT_STACK};color:${BRAND.failText};font-weight:600;">Error Type: ${errorType}</p>
          <p style="margin:6px 0 0;font-size:12px;font-family:${FONT_STACK};color:${BRAND.failText};">Environment: ${process.env.NODE_ENV || 'development'}</p>
        </div>
        <h4 style="color:${BRAND.text};font-size:13px;font-family:${FONT_STACK};font-weight:600;margin:0 0 8px;">Error Details</h4>
        <pre style="background:#f4f4f4;padding:12px;border-radius:4px;font-size:11px;overflow-x:auto;color:${BRAND.text};font-family:monospace;">${JSON.stringify(errorDetails, null, 2)}</pre>
        ${clientData ? `
        <div style="margin-top:16px;">
          <h4 style="color:${BRAND.text};font-size:13px;font-family:${FONT_STACK};font-weight:600;margin:0 0 8px;">Client Information</h4>
          <table style="width:100%;border-collapse:collapse;">
            ${infoRow('Name', `${clientData.firstName || ''} ${clientData.lastName || ''}`)}
            ${infoRow('Email', clientData.email)}
            ${infoRow('Location', clientData.location)}
            ${infoRow('Therapist', clientData.SelectedTherapist)}
            ${infoRow('Meeting Type', clientData.meetingType)}
            ${infoRow('Amount', clientData.amount)}
          </table>
        </div>` : ''}
      </div>
      ${emailFooter()}
    `;

    await transporter.sendMail({
      from: process.env.ZOHO_EMAIL,
      to: ERROR_NOTIFICATION_EMAILS,
      subject,
      html: emailWrapper(body),
    });
    console.log('Error notification email sent successfully');
  } catch (error) {
    console.error('Failed to send error notification email:', error);
  }
};

// ─── sendPaymentStatusNotification ───────────────────────────────────────────

const sendPaymentStatusNotification = async (paymentData, status, clientData = null) => {
  try {
    if (!canSendPaymentStatusNotification()) {
      console.warn('Suppressing payment status notification email (rate limit reached)', { status, reference: paymentData.reference });
      return;
    }

    const firstName = paymentData.metadata?.customer_first_name || '';
    const lastName = paymentData.metadata?.customer_last_name || '';
    const name = `${firstName} ${lastName}`.trim() || 'Unknown';

    const statusConfig = {
      success:   { color: '#2E7D32', bg: BRAND.successBg, textColor: BRAND.successText, label: 'Success',   statusLabel: 'SUCCESS'   },
      failed:    { color: '#C62828', bg: BRAND.failBg,    textColor: BRAND.failText,    label: 'Failed',    statusLabel: 'FAILED'    },
      abandoned: { color: '#E65100', bg: BRAND.warnBg,    textColor: BRAND.warnText,    label: 'Abandoned', statusLabel: 'ABANDONED' },
    };
    const cfg = statusConfig[status] || statusConfig.failed;

    const currency = paymentData.currency || 'NGN';
    const gateway = currency === 'USD' ? 'Squad' : 'Paystack';
    const formattedAmt = formatAmount(paymentData.amount || 0, currency);

    const body = `
      ${emailHeader(`Payment ${cfg.label} — ${gateway}`, `Transaction notification  |  ${new Date().toLocaleString()}`)}

      <div style="padding:16px 32px 0;">
        <div style="background:${cfg.bg};border-left:4px solid ${cfg.color};padding:12px 16px;border-radius:4px;">
          <p style="margin:0;font-size:14px;font-weight:700;font-family:${FONT_STACK};color:${cfg.textColor};">Status: ${cfg.statusLabel}</p>
          <p style="margin:4px 0 0;font-size:12px;font-family:${FONT_STACK};color:${cfg.textColor};">Gateway: ${gateway}</p>
        </div>
      </div>

      ${section('Payment Information',
        infoRow('Reference', paymentData.reference) +
        infoRow('Amount', formattedAmt) +
        infoRow('Currency', currency) +
        infoRow('Gateway', gateway) +
        infoRow('Date', paymentData.created_at ? new Date(paymentData.created_at).toLocaleString() : null)
      )}

      ${divider()}

      ${section('Customer Details',
        infoRow('Name', name) +
        infoRow('Email', paymentData.customer?.email) +
        infoRow('Phone', paymentData.customer?.phone)
      )}

      ${clientData ? `
        ${divider()}
        ${section('Therapy Session',
          infoRow('Therapist', clientData.SelectedTherapist) +
          infoRow('Location', clientData.location) +
          infoRow('Meeting Type', clientData.meetingType) +
          (clientData.discountCode ? infoRow('Discount', clientData.discountName || clientData.discountCode) : '')
        )}` : ''}

      ${status !== 'success' ? `
      <div style="padding:0 32px 20px;">
        <div style="background:${BRAND.failBg};border-left:4px solid #C62828;padding:14px;border-radius:4px;">
          <p style="margin:0;font-size:13px;font-family:${FONT_STACK};color:${BRAND.failText};font-weight:600;">Action Required</p>
          <p style="margin:6px 0 0;font-size:13px;font-family:${FONT_STACK};color:${BRAND.failText};">This payment requires attention. A follow-up email has been sent to the customer directly.</p>
        </div>
      </div>` : ''}

      ${emailFooter()}
    `;

    await transporter.sendMail({
      from: process.env.ZOHO_EMAIL,
      to: SUPPORT_EMAILS,
      subject: `Payment ${cfg.label} — ${name} | EmpathySpace`,
      html: emailWrapper(body),
    });
    console.log(`Payment ${status} notification sent for ${name}`);
  } catch (error) {
    console.error('Failed to send payment status notification:', error);
    console.error('Payment data:', JSON.stringify(paymentData, null, 2));
  }
};

// ─── sendCustomerFollowUpEmail ────────────────────────────────────────────────

const sendCustomerFollowUpEmail = async (customerEmail, customerName, status, paymentDetails = {}) => {
  if (!customerEmail || customerEmail === 'N/A') return;

  try {
    const isAbandoned = status === 'abandoned';

    const issueLines = isAbandoned
      ? [
          'Your payment session timed out or was closed before it was completed.',
          'Your card or bank may have declined the transaction.',
          'There may have been a temporary issue with your internet connection.',
        ]
      : [
          paymentDetails.reason && paymentDetails.reason !== 'Unknown'
            ? `Payment declined: ${paymentDetails.reason}`
            : 'Your payment was declined by your card or bank.',
          'Insufficient funds or card limit reached.',
          'Your card may not be enabled for online transactions.',
        ];

    const subject = isAbandoned
      ? 'We noticed you started booking a session — can we help?'
      : 'Your appointment booking was not completed — we\'re here to help';

    const body = `
      ${emailHeader('We\'re Here to Help', 'EmpathySpace Consulting')}

      <div style="padding:24px 32px 8px;">
        <p style="font-size:15px;font-family:${FONT_STACK};color:${BRAND.text};margin:0 0 16px;">Dear ${customerName || 'Valued Client'},</p>
        <p style="font-size:14px;font-family:${FONT_STACK};color:${BRAND.text};line-height:1.7;margin:0 0 16px;">
          We noticed that you recently attempted to book a therapy session with us but were unable to complete your payment. We understand that technical issues can be frustrating, and we want to make sure you get the support you need.
        </p>
        <p style="font-size:14px;font-family:${FONT_STACK};color:${BRAND.muted};margin:0 0 8px;font-weight:600;">Possible reasons this may have occurred:</p>
        <ul style="padding-left:20px;margin:0 0 20px;">
          ${issueLines.map(l => `<li style="font-size:14px;font-family:${FONT_STACK};color:${BRAND.text};line-height:1.7;margin-bottom:6px;">${l}</li>`).join('')}
        </ul>
        <p style="font-size:14px;font-family:${FONT_STACK};color:${BRAND.text};line-height:1.7;margin:0 0 20px;">
          You are welcome to try again at any time on our website. If you continue to experience difficulties or would prefer to book directly, please reach out to us — we will be happy to assist you.
        </p>
      </div>

      <div style="padding:0 32px 24px;">
        <div style="background:${BRAND.primaryLight};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 10px;font-size:14px;font-family:${FONT_STACK};font-weight:700;color:${BRAND.primaryDark};">Contact Us</p>
          <table style="width:100%;border-collapse:collapse;">
            ${infoRow('Phone', `<a href="tel:+2349136559988" style="color:${BRAND.primary};text-decoration:none;">0913 655 9988</a>`)}
            ${infoRow('Email', `<a href="mailto:info@empathyspaceng.org" style="color:${BRAND.primary};text-decoration:none;">info@empathyspaceng.org</a>`)}
            ${infoRow('Alt. Email', `<a href="mailto:estherapyhub@gmail.com" style="color:${BRAND.primary};text-decoration:none;">estherapyhub@gmail.com</a>`)}
            ${infoRow('Website', `<a href="https://www.myempathyspace.com" style="color:${BRAND.primary};text-decoration:none;">www.myempathyspace.com</a>`)}
          </table>
        </div>
      </div>

      <div style="padding:0 32px 24px;">
        <p style="font-size:14px;font-family:${FONT_STACK};color:${BRAND.text};line-height:1.7;margin:0;">
          We look forward to supporting your mental health journey.<br>
          Warm regards,<br>
          <strong style="color:${BRAND.primaryDark};">The EmpathySpace Team</strong>
        </p>
      </div>

      ${emailFooter()}
    `;

    await transporter.sendMail({
      from: process.env.ZOHO_EMAIL,
      to: customerEmail,
      subject,
      html: emailWrapper(body),
    });
    console.log(`Customer follow-up email sent to ${customerEmail}`);
  } catch (error) {
    console.error(`Failed to send customer follow-up to ${customerEmail}:`, error.message);
  }
};

// ─── sendPaymentSummaryEmail ──────────────────────────────────────────────────

const sendPaymentSummaryEmail = async (paystackSummary, squadSummary = null) => {
  try {
    const { timeRange, totals, amounts, details } = paystackSummary;
    const fromDate = new Date(timeRange.from).toLocaleString();
    const toDate = new Date(timeRange.to).toLocaleString();

    const hasSquad = squadSummary && squadSummary.totals.totalTransactions > 0;
    const combinedTotal = totals.totalTransactions + (hasSquad ? squadSummary.totals.totalTransactions : 0);

    const subject = `Payment Summary Report — ${combinedTotal} transactions (last ${timeRange.hoursBack}h) | EmpathySpace`;

    const successRate = totals.totalTransactions > 0
      ? ((totals.successful / totals.totalTransactions) * 100).toFixed(1) : 0;

    // ── Stat card ─────────────────────────────────────────────────────────────
    const statCard = (count, label, bg, textColor, rate = null) => `
      <div style="flex:1;min-width:130px;background:${bg};padding:16px;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;font-family:${FONT_STACK};color:${textColor};">${count}</p>
        <p style="margin:5px 0 0;font-size:12px;font-family:${FONT_STACK};color:${textColor};font-weight:500;">${label}</p>
        ${rate !== null ? `<p style="margin:4px 0 0;font-size:12px;font-weight:700;font-family:${FONT_STACK};color:${textColor};">${rate}%</p>` : ''}
      </div>`;

    // ── Paystack table ────────────────────────────────────────────────────────
    const generateNGNTable = (payments, status) => {
      if (!payments.length)
        return `<p style="color:${BRAND.muted};font-style:italic;font-size:13px;font-family:${FONT_STACK};">No ${status} payments in this period.</p>`;

      const headerColor = { successful: '#2E7D32', failed: '#C62828', abandoned: '#E65100' }[status];
      const rows = payments.map(p => `
        <tr style="border-bottom:1px solid ${BRAND.border};">
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">
            <span style="font-weight:600;">${p.customer}</span><br>
            <span style="color:${BRAND.muted};font-size:11px;">${p.email}</span>
          </td>
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">NGN ${(p.amount / 100).toLocaleString()}</td>
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">${p.therapist}</td>
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">${p.meetingType}</td>
          <td style="padding:9px 10px;font-size:12px;font-family:${FONT_STACK};color:${BRAND.muted};">${new Date(p.date).toLocaleString()}</td>
          ${status === 'failed' ? `<td style="padding:9px 10px;font-size:12px;font-family:${FONT_STACK};color:${BRAND.failText};">${p.reason}</td>` : ''}
        </tr>`).join('');

      return `
        <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK};">
          <thead>
            <tr style="background:${headerColor};color:white;">
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Customer</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Amount (NGN)</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Therapist</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Type</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Date</th>
              ${status === 'failed' ? `<th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Reason</th>` : ''}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    };

    // ── Squad table ───────────────────────────────────────────────────────────
    const generateUSDTable = (payments, status) => {
      if (!payments.length)
        return `<p style="color:${BRAND.muted};font-style:italic;font-size:13px;font-family:${FONT_STACK};">No ${status} Squad payments in this period.</p>`;

      const headerColor = { successful: '#2E7D32', failed: '#C62828', abandoned: '#E65100' }[status];
      const rows = payments.map(p => `
        <tr style="border-bottom:1px solid ${BRAND.border};">
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">
            <span style="font-weight:600;">${p.customer}</span><br>
            <span style="color:${BRAND.muted};font-size:11px;">${p.email}</span>
          </td>
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">$${(p.amount / 100).toFixed(2)}</td>
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">${p.therapist}</td>
          <td style="padding:9px 10px;font-size:13px;font-family:${FONT_STACK};color:${BRAND.text};">${p.meetingType}</td>
          <td style="padding:9px 10px;font-size:12px;font-family:${FONT_STACK};color:${BRAND.muted};">${new Date(p.date).toLocaleString()}</td>
          ${status === 'failed' ? `<td style="padding:9px 10px;font-size:12px;font-family:${FONT_STACK};color:${BRAND.failText};">${p.reason || 'N/A'}</td>` : ''}
        </tr>`).join('');

      return `
        <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK};">
          <thead>
            <tr style="background:${headerColor};color:white;">
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Customer</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Amount (USD)</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Therapist</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Type</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Date</th>
              ${status === 'failed' ? `<th style="padding:9px 10px;text-align:left;font-size:12px;font-family:${FONT_STACK};">Reason</th>` : ''}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    };

    const body = `
      ${emailHeader('Payment Summary Report', `${fromDate} — ${toDate}  |  ${timeRange.hoursBack}-hour window`)}

      <!-- Overview stats -->
      <div style="padding:20px 32px 0;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${statCard(totals.successful, 'Paystack Successful', BRAND.successBg, BRAND.successText, successRate)}
          ${statCard(totals.failed, 'Paystack Failed', BRAND.failBg, BRAND.failText)}
          ${statCard(totals.abandoned, 'Paystack Abandoned', BRAND.warnBg, BRAND.warnText)}
          ${hasSquad ? statCard(squadSummary.totals.successful, 'Squad Successful', BRAND.successBg, BRAND.successText) : ''}
        </div>
      </div>

      ${divider()}

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PAYSTACK (NGN)                                                     -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      ${sectionHeader('Paystack — NGN Payments', '#1A237E')}

      ${section('NGN Revenue Summary',
        infoRow('Successful Revenue', `<span style="color:#2E7D32;font-weight:700;">NGN ${(amounts.totalSuccessful / 100).toLocaleString()}</span>`) +
        infoRow('Failed Amount', `NGN ${(amounts.totalFailed / 100).toLocaleString()}`) +
        infoRow('Abandoned Amount', `NGN ${(amounts.totalAbandoned / 100).toLocaleString()}`) +
        infoRow('Success Rate', `${successRate}%`) +
        infoRow('Potential Lost', `NGN ${((amounts.totalFailed + amounts.totalAbandoned) / 100).toLocaleString()}`)
      )}

      <div style="padding:0 32px 8px;">
        <p style="margin:0 0 8px;font-size:13px;font-family:${FONT_STACK};font-weight:600;color:${BRAND.successText};">
          Successful Payments (${totals.successful})
        </p>
        ${generateNGNTable(details.successful, 'successful')}
      </div>

      ${totals.failed > 0 ? `
      <div style="padding:16px 32px 8px;">
        <p style="margin:0 0 8px;font-size:13px;font-family:${FONT_STACK};font-weight:600;color:${BRAND.failText};">
          Failed Payments (${totals.failed})
        </p>
        ${generateNGNTable(details.failed, 'failed')}
        <div style="background:${BRAND.failBg};border-left:4px solid #C62828;padding:10px 12px;border-radius:4px;margin-top:10px;">
          <p style="margin:0;font-size:12px;font-family:${FONT_STACK};color:${BRAND.failText};">Follow-up emails have been sent to each affected customer.</p>
        </div>
      </div>` : ''}

      ${totals.abandoned > 0 ? `
      <div style="padding:16px 32px 8px;">
        <p style="margin:0 0 8px;font-size:13px;font-family:${FONT_STACK};font-weight:600;color:${BRAND.warnText};">
          Abandoned Payments (${totals.abandoned})
        </p>
        ${generateNGNTable(details.abandoned, 'abandoned')}
        <div style="background:${BRAND.warnBg};border-left:4px solid #E65100;padding:10px 12px;border-radius:4px;margin-top:10px;">
          <p style="margin:0;font-size:12px;font-family:${FONT_STACK};color:${BRAND.warnText};">Follow-up emails have been sent to each affected customer.</p>
        </div>
      </div>` : ''}

      ${hasSquad ? `
        ${divider()}

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- SQUAD (USD)                                                        -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        ${sectionHeader('Squad — USD Payments', '#1A237E')}

        ${section('USD Revenue Summary',
          infoRow('Successful Revenue', `<span style="color:#2E7D32;font-weight:700;">$${(squadSummary.amounts.totalSuccessful / 100).toFixed(2)}</span>`) +
          infoRow('Failed Amount', `$${(squadSummary.amounts.totalFailed / 100).toFixed(2)}`) +
          infoRow('Abandoned Amount', `$${(squadSummary.amounts.totalAbandoned / 100).toFixed(2)}`)
        )}

        <div style="padding:0 32px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-family:${FONT_STACK};font-weight:600;color:${BRAND.successText};">
            Successful Payments (${squadSummary.totals.successful})
          </p>
          ${generateUSDTable(squadSummary.details.successful, 'successful')}
        </div>

        ${squadSummary.totals.failed > 0 ? `
        <div style="padding:16px 32px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-family:${FONT_STACK};font-weight:600;color:${BRAND.failText};">
            Failed Payments (${squadSummary.totals.failed})
          </p>
          ${generateUSDTable(squadSummary.details.failed, 'failed')}
        </div>` : ''}

        ${squadSummary.totals.abandoned > 0 ? `
        <div style="padding:16px 32px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-family:${FONT_STACK};font-weight:600;color:${BRAND.warnText};">
            Abandoned Payments (${squadSummary.totals.abandoned})
          </p>
          ${generateUSDTable(squadSummary.details.abandoned, 'abandoned')}
        </div>` : ''}
      ` : ''}

      <div style="padding:16px 32px 24px;">
        <p style="margin:0;font-size:11px;color:${BRAND.muted};font-family:${FONT_STACK};text-align:center;">
          Generated ${new Date().toLocaleString()}  |  Auto-sent every ${timeRange.hoursBack} hours
        </p>
      </div>

      ${emailFooter()}
    `;

    await transporter.sendMail({
      from: process.env.ZOHO_EMAIL,
      to: SUPPORT_EMAILS,
      subject,
      html: emailWrapper(body),
    });
    console.log(`Payment summary email sent (${combinedTotal} transactions)`);
  } catch (error) {
    console.error('Failed to send payment summary email:', error);
    throw error;
  }
};

module.exports = {
  sendErrorNotification,
  sendPaymentStatusNotification,
  sendCustomerFollowUpEmail,
  sendPaymentSummaryEmail,
};
