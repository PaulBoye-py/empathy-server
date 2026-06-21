// utils/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const SUPPORT_EMAILS = process.env.NODE_ENV === 'production'
  ? [
      'estherapyhub@gmail.com',
      'asereopeyemimichael@gmail.com',
      'paul.adeboye@yahoo.com',
      'timiasha7@gmail.com',
      'kunle.ogunsola@gmail.com',
      'drkaf@empathyspaceng.org',
      'info@empathyspaceng.org',
    ]
  : ['paul.adeboye@yahoo.com'];

const ERROR_NOTIFICATION_EMAILS = [
  'paul.adeboye@yahoo.com',
  'timiasha7@gmail.com',
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

// ─── Shared layout wrappers ───────────────────────────────────────────────────

const emailHeader = (title, subtitle = '') => `
  <div style="background-color:${BRAND.primary};padding:28px 32px;border-radius:10px 10px 0 0;">
    <img src="https://www.myempathyspace.com/logo.png" alt="Empathy Space" style="height:36px;margin-bottom:12px;display:block;" onerror="this.style.display='none'"/>
    <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;color:${BRAND.white};font-weight:700;">${title}</h1>
    ${subtitle ? `<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);font-family:Arial,sans-serif;">${subtitle}</p>` : ''}
  </div>
`;

const emailFooter = () => `
  <div style="background-color:${BRAND.primaryLight};padding:20px 32px;border-radius:0 0 10px 10px;border-top:2px solid ${BRAND.border};text-align:center;">
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:${BRAND.muted};">
      <strong style="color:${BRAND.primary};">Empathy Space Consulting</strong>
    </p>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};font-family:Arial,sans-serif;">
      77 Tafawa Balewa Cres, Surulere, Lagos &nbsp;|&nbsp;
      <a href="mailto:info@empathyspaceng.org" style="color:${BRAND.primary};text-decoration:none;">info@empathyspaceng.org</a> &nbsp;|&nbsp;
      <a href="tel:+2349136559988" style="color:${BRAND.primary};text-decoration:none;">0913 655 9988</a>
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:${BRAND.muted};font-family:Arial,sans-serif;">
      This is an automated notification. Please do not reply to this email.
    </p>
  </div>
`;

const emailWrapper = (body) => `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:20px;background-color:#F5F5F0;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;background:${BRAND.white};border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      ${body}
    </div>
  </body>
  </html>
`;

const infoRow = (label, value) =>
  `<tr><td style="padding:7px 0;color:${BRAND.muted};font-size:13px;width:40%;vertical-align:top;">${label}</td><td style="padding:7px 0;color:${BRAND.text};font-size:13px;font-weight:600;">${value || 'N/A'}</td></tr>`;

const section = (title, color, rows) => `
  <div style="padding:20px 32px;">
    <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:${color};border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>
`;

// ─── Amount formatter ─────────────────────────────────────────────────────────

const formatAmount = (amount, currency) => {
  if (currency === 'USD') {
    // Squad stores USD amounts in cents
    return `$${(amount / 100).toFixed(2)}`;
  }
  // Paystack stores NGN in kobo
  return `₦${(amount / 100).toLocaleString()}`;
};

// ─── sendErrorNotification ────────────────────────────────────────────────────

const sendErrorNotification = async (errorType, errorDetails, clientData = null) => {
  try {
    const subject = `🚨 ${errorType} — Empathy Space`;

    const body = `
      ${emailHeader('System Error Notification', new Date().toLocaleString())}
      <div style="padding:20px 32px;">
        <div style="background:${BRAND.failBg};border-left:4px solid #dc3545;padding:14px;border-radius:4px;margin-bottom:16px;">
          <p style="margin:0;font-size:14px;color:${BRAND.failText};font-weight:600;">Error Type: ${errorType}</p>
          <p style="margin:6px 0 0;font-size:12px;color:${BRAND.failText};">Environment: ${process.env.NODE_ENV || 'development'}</p>
        </div>
        <h4 style="color:${BRAND.text};font-size:13px;margin:0 0 8px;">Error Details</h4>
        <pre style="background:#f4f4f4;padding:12px;border-radius:4px;font-size:11px;overflow-x:auto;color:${BRAND.text};">${JSON.stringify(errorDetails, null, 2)}</pre>
        ${clientData ? `
        <div style="margin-top:16px;">
          <h4 style="color:${BRAND.text};font-size:13px;margin:0 0 8px;">Client Information</h4>
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

// ─── sendPaymentStatusNotification (internal team email) ─────────────────────

const sendPaymentStatusNotification = async (paymentData, status, clientData = null) => {
  try {
    const firstName = paymentData.metadata?.customer_first_name || '';
    const lastName = paymentData.metadata?.customer_last_name || '';
    const name = `${firstName} ${lastName}`.trim() || 'Unknown';

    const statusConfig = {
      success:   { color: '#2E7D32', bg: BRAND.successBg, textColor: BRAND.successText, emoji: '✅', label: 'Success' },
      failed:    { color: '#C62828', bg: BRAND.failBg,    textColor: BRAND.failText,    emoji: '❌', label: 'Failed' },
      abandoned: { color: '#E65100', bg: BRAND.warnBg,   textColor: BRAND.warnText,    emoji: '⚠️', label: 'Abandoned' },
    };
    const cfg = statusConfig[status] || statusConfig.failed;

    const currency = paymentData.currency || 'NGN';
    const formattedAmt = formatAmount(paymentData.amount || 0, currency);

    const body = `
      ${emailHeader(`${cfg.emoji} Payment ${cfg.label}`, `Transaction notification — ${new Date().toLocaleString()}`)}

      <div style="padding:16px 32px 0;">
        <div style="background:${cfg.bg};border-left:4px solid ${cfg.color};padding:12px 16px;border-radius:4px;">
          <p style="margin:0;font-size:15px;font-weight:700;color:${cfg.textColor};">Status: ${cfg.label.toUpperCase()}</p>
        </div>
      </div>

      ${section('Payment Information', BRAND.primary,
        infoRow('Reference', paymentData.reference) +
        infoRow('Amount', formattedAmt) +
        infoRow('Currency', currency) +
        infoRow('Date', paymentData.created_at ? new Date(paymentData.created_at).toLocaleString() : null)
      )}

      ${section('Customer Details', BRAND.primaryDark,
        infoRow('Name', name) +
        infoRow('Email', paymentData.customer?.email) +
        infoRow('Phone', paymentData.customer?.phone)
      )}

      ${clientData ? section('Therapy Session', BRAND.primary,
        infoRow('Therapist', clientData.SelectedTherapist) +
        infoRow('Location', clientData.location) +
        infoRow('Meeting Type', clientData.meetingType) +
        (clientData.discountCode ? infoRow('Discount', clientData.discountName || clientData.discountCode) : '')
      ) : ''}

      ${status !== 'success' ? `
      <div style="padding:0 32px 20px;">
        <div style="background:${BRAND.failBg};border-left:4px solid #dc3545;padding:14px;border-radius:4px;">
          <p style="margin:0;font-size:13px;color:${BRAND.failText};font-weight:600;">Action Required</p>
          <p style="margin:6px 0 0;font-size:13px;color:${BRAND.failText};">This payment requires attention. A follow-up email has been sent to the customer directly.</p>
        </div>
      </div>` : ''}

      ${emailFooter()}
    `;

    await transporter.sendMail({
      from: process.env.ZOHO_EMAIL,
      to: SUPPORT_EMAILS,
      subject: `${cfg.emoji} Payment ${cfg.label} — ${name}`,
      html: emailWrapper(body),
    });
    console.log(`Payment ${status} notification sent for ${name}`);
  } catch (error) {
    console.error('Failed to send payment status notification:', error);
    console.error('Payment data:', JSON.stringify(paymentData, null, 2));
  }
};

// ─── sendCustomerFollowUpEmail (sent to the customer directly) ────────────────

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
      ${emailHeader('We\'re Here to Help', 'Empathy Space Consulting')}

      <div style="padding:24px 32px 8px;">
        <p style="font-size:15px;color:${BRAND.text};margin:0 0 16px;">Dear ${customerName || 'Valued Client'},</p>
        <p style="font-size:14px;color:${BRAND.text};line-height:1.7;margin:0 0 16px;">
          We noticed that you recently attempted to book a therapy session with us but were unable to complete your payment. We understand that technical issues can be frustrating, and we want to make sure you get the support you need.
        </p>
        <p style="font-size:14px;color:${BRAND.muted};margin:0 0 8px;">Possible reasons this may have occurred:</p>
        <ul style="padding-left:20px;margin:0 0 20px;">
          ${issueLines.map(l => `<li style="font-size:14px;color:${BRAND.text};line-height:1.7;margin-bottom:6px;">${l}</li>`).join('')}
        </ul>
        <p style="font-size:14px;color:${BRAND.text};line-height:1.7;margin:0 0 20px;">
          You are welcome to try again at any time on our website. If you continue to experience difficulties or would prefer to book directly, please reach out to us — we will be happy to assist you.
        </p>
      </div>

      <div style="padding:0 32px 24px;">
        <div style="background:${BRAND.primaryLight};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:${BRAND.primaryDark};">Contact Us</p>
          <table style="width:100%;border-collapse:collapse;">
            ${infoRow('Phone', '<a href="tel:+2349136559988" style="color:' + BRAND.primary + ';text-decoration:none;">0913 655 9988</a>')}
            ${infoRow('Email', '<a href="mailto:info@empathyspaceng.org" style="color:' + BRAND.primary + ';text-decoration:none;">info@empathyspaceng.org</a>')}
            ${infoRow('Alt. Email', '<a href="mailto:estherapyhub@gmail.com" style="color:' + BRAND.primary + ';text-decoration:none;">estherapyhub@gmail.com</a>')}
            ${infoRow('Website', '<a href="https://www.myempathyspace.com" style="color:' + BRAND.primary + ';text-decoration:none;">www.myempathyspace.com</a>')}
          </table>
        </div>
      </div>

      <div style="padding:0 32px 24px;">
        <p style="font-size:14px;color:${BRAND.text};line-height:1.7;margin:0;">
          We look forward to supporting your mental health journey.<br>
          Warm regards,<br>
          <strong style="color:${BRAND.primaryDark};">The Empathy Space Team</strong>
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
    const subject = `📊 Empathy Space — Payment Summary Report (${combinedTotal} transactions, last ${timeRange.hoursBack}h)`;

    const successRate = totals.totalTransactions > 0
      ? ((totals.successful / totals.totalTransactions) * 100).toFixed(1)
      : 0;

    // ── Paystack table ──────────────────────────────────────────────────────
    const generateNGNTable = (payments, status) => {
      if (!payments.length)
        return `<p style="color:${BRAND.muted};font-style:italic;font-size:13px;">No ${status} payments in this period.</p>`;

      const headerColor = { successful: '#2E7D32', failed: '#C62828', abandoned: '#E65100' }[status];
      let rows = payments.map(p => `
        <tr style="border-bottom:1px solid ${BRAND.border};">
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">
            <strong>${p.customer}</strong><br>
            <span style="color:${BRAND.muted};font-size:11px;">${p.email}</span>
          </td>
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">₦${(p.amount / 100).toLocaleString()}</td>
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">${p.therapist}</td>
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">${p.meetingType}</td>
          <td style="padding:8px 10px;font-size:12px;color:${BRAND.muted};">${new Date(p.date).toLocaleString()}</td>
          ${status === 'failed' ? `<td style="padding:8px 10px;font-size:12px;color:${BRAND.failText};">${p.reason}</td>` : ''}
        </tr>`).join('');

      return `
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
          <thead>
            <tr style="background:${headerColor};color:white;">
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Customer</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Amount</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Therapist</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Type</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Date</th>
              ${status === 'failed' ? '<th style="padding:9px 10px;text-align:left;font-size:12px;">Reason</th>' : ''}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    };

    // ── Squad table ─────────────────────────────────────────────────────────
    const generateUSDTable = (payments, status) => {
      if (!payments.length)
        return `<p style="color:${BRAND.muted};font-style:italic;font-size:13px;">No ${status} Squad payments in this period.</p>`;

      const headerColor = { successful: '#2E7D32', failed: '#C62828', abandoned: '#E65100' }[status];
      let rows = payments.map(p => `
        <tr style="border-bottom:1px solid ${BRAND.border};">
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">
            <strong>${p.customer}</strong><br>
            <span style="color:${BRAND.muted};font-size:11px;">${p.email}</span>
          </td>
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">$${(p.amount / 100).toFixed(2)}</td>
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">${p.therapist}</td>
          <td style="padding:8px 10px;font-size:13px;color:${BRAND.text};">${p.meetingType}</td>
          <td style="padding:8px 10px;font-size:12px;color:${BRAND.muted};">${new Date(p.date).toLocaleString()}</td>
          ${status === 'failed' ? `<td style="padding:8px 10px;font-size:12px;color:${BRAND.failText};">${p.reason || 'N/A'}</td>` : ''}
        </tr>`).join('');

      return `
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
          <thead>
            <tr style="background:${headerColor};color:white;">
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Customer</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Amount (USD)</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Therapist</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Type</th>
              <th style="padding:9px 10px;text-align:left;font-size:12px;">Date</th>
              ${status === 'failed' ? '<th style="padding:9px 10px;text-align:left;font-size:12px;">Reason</th>' : ''}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    };

    const statCard = (count, label, bg, textColor, rate = null) => `
      <div style="flex:1;min-width:140px;background:${bg};padding:18px;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:30px;font-weight:700;color:${textColor};">${count}</p>
        <p style="margin:5px 0 0;font-size:13px;color:${textColor};">${label}</p>
        ${rate !== null ? `<p style="margin:4px 0 0;font-size:12px;font-weight:700;color:${textColor};">${rate}%</p>` : ''}
      </div>`;

    const body = `
      ${emailHeader('📊 Payment Summary Report', `${fromDate} — ${toDate} (${timeRange.hoursBack} hours)`)}

      <!-- Stats row -->
      <div style="padding:20px 32px 0;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${statCard(totals.successful, '✅ Paystack Success', BRAND.successBg, BRAND.successText, successRate)}
          ${statCard(totals.failed, '❌ Paystack Failed', BRAND.failBg, BRAND.failText)}
          ${statCard(totals.abandoned, '⚠️ Paystack Abandoned', BRAND.warnBg, BRAND.warnText)}
          ${hasSquad ? statCard(squadSummary.totals.successful, '✅ Squad Success', BRAND.successBg, BRAND.successText) : ''}
        </div>
      </div>

      <!-- NGN Financial Summary -->
      ${section('NGN Revenue (Paystack)', BRAND.primary,
        infoRow('Successful Revenue', `<span style="color:#2E7D32;font-weight:700;">₦${(amounts.totalSuccessful / 100).toLocaleString()}</span>`) +
        infoRow('Failed Amount', `₦${(amounts.totalFailed / 100).toLocaleString()}`) +
        infoRow('Abandoned Amount', `₦${(amounts.totalAbandoned / 100).toLocaleString()}`) +
        infoRow('Success Rate', `${successRate}%`) +
        infoRow('Potential Lost', `₦${((amounts.totalFailed + amounts.totalAbandoned) / 100).toLocaleString()}`)
      )}

      ${hasSquad ? section('USD Revenue (Squad)', BRAND.primary,
        infoRow('Successful Revenue', `<span style="color:#2E7D32;font-weight:700;">$${(squadSummary.amounts.totalSuccessful / 100).toFixed(2)}</span>`) +
        infoRow('Failed Amount', `$${(squadSummary.amounts.totalFailed / 100).toFixed(2)}`) +
        infoRow('Abandoned Amount', `$${(squadSummary.amounts.totalAbandoned / 100).toFixed(2)}`)
      ) : ''}

      <!-- Paystack Transactions -->
      <div style="padding:20px 32px 0;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:#2E7D32;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">
          ✅ Paystack — Successful Payments (${totals.successful})
        </h3>
        ${generateNGNTable(details.successful, 'successful')}
      </div>

      ${totals.failed > 0 ? `
      <div style="padding:20px 32px 0;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:#C62828;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">
          ❌ Paystack — Failed Payments (${totals.failed})
        </h3>
        ${generateNGNTable(details.failed, 'failed')}
        <div style="background:${BRAND.failBg};border-left:4px solid #dc3545;padding:12px;border-radius:4px;margin-top:12px;">
          <p style="margin:0;font-size:13px;color:${BRAND.failText};">Follow-up emails have been sent to each customer individually.</p>
        </div>
      </div>` : ''}

      ${totals.abandoned > 0 ? `
      <div style="padding:20px 32px 0;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:#E65100;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">
          ⚠️ Paystack — Abandoned Payments (${totals.abandoned})
        </h3>
        ${generateNGNTable(details.abandoned, 'abandoned')}
        <div style="background:${BRAND.warnBg};border-left:4px solid #E65100;padding:12px;border-radius:4px;margin-top:12px;">
          <p style="margin:0;font-size:13px;color:${BRAND.warnText};">Follow-up emails have been sent to each customer individually.</p>
        </div>
      </div>` : ''}

      <!-- Squad Transactions -->
      ${hasSquad ? `
      <div style="padding:20px 32px 0;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:#2E7D32;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">
          ✅ Squad — Successful Payments (${squadSummary.totals.successful})
        </h3>
        ${generateUSDTable(squadSummary.details.successful, 'successful')}
      </div>

      ${squadSummary.totals.failed > 0 ? `
      <div style="padding:20px 32px 0;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:#C62828;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">
          ❌ Squad — Failed Payments (${squadSummary.totals.failed})
        </h3>
        ${generateUSDTable(squadSummary.details.failed, 'failed')}
      </div>` : ''}

      ${squadSummary.totals.abandoned > 0 ? `
      <div style="padding:20px 32px 0;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:15px;color:#E65100;border-bottom:1px solid ${BRAND.border};padding-bottom:8px;">
          ⚠️ Squad — Abandoned Payments (${squadSummary.totals.abandoned})
        </h3>
        ${generateUSDTable(squadSummary.details.abandoned, 'abandoned')}
      </div>` : ''}
      ` : ''}

      <div style="padding:16px 32px 24px;">
        <p style="margin:0;font-size:12px;color:${BRAND.muted};text-align:center;">
          Report generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Auto-generated every ${timeRange.hoursBack} hours
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
    console.log(`✅ Payment summary email sent (${combinedTotal} transactions)`);
  } catch (error) {
    console.error('❌ Failed to send payment summary email:', error);
    throw error;
  }
};

module.exports = {
  sendErrorNotification,
  sendPaymentStatusNotification,
  sendCustomerFollowUpEmail,
  sendPaymentSummaryEmail,
};
