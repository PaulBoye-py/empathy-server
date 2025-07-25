// utils/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');


// Support team emails
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
  : [
      'paul.adeboye@yahoo.com',
    ];


// ✅ ZOHO SMTP Configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  // port: 587,
  // secure: false, // true for 465, false for other ports
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL, // Your Zoho email
    pass: process.env.ZOHO_PASSWORD // Your Zoho password or app password
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  },
  connectionTimeout: 10000,   // 10 seconds
  greetingTimeout: 5000,      // 5 seconds  
  socketTimeout: 10000,       // 10 seconds
  debug: true,                // Enable debug for troubleshooting
  logger: true                // Enable logging
});

const sendErrorNotification = async (errorType, errorDetails, clientData = null) => {
  try {
    const subject = `🚨 ${errorType} Error - Therapy Hub`;
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
          Error Notification
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Error Type: ${errorType}</h3>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-top: 0;">Error Details:</h4>
          <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">${JSON.stringify(errorDetails, null, 2)}</pre>
        </div>
    `;

    if (clientData) {
      htmlContent += `
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">Client Information:</h4>
          <p><strong>Name:</strong> ${clientData.firstName || 'N/A'} ${clientData.lastName || 'N/A'}</p>
          <p><strong>Email:</strong> ${clientData.email || 'N/A'}</p>
          <p><strong>Location:</strong> ${clientData.location || 'N/A'}</p>
          <p><strong>Selected Therapist:</strong> ${clientData.SelectedTherapist || 'N/A'}</p>
          <p><strong>Meeting Type:</strong> ${clientData.meetingType || 'N/A'}</p>
          <p><strong>Amount:</strong> ${clientData.amount || 'N/A'}</p>
        </div>
      `;
    }

    htmlContent += `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #6c757d; margin: 0;">
            <strong>Action Required:</strong> Please investigate and resolve this issue as soon as possible.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: SUPPORT_EMAILS,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('Error notification email sent successfully');
    
  } catch (error) {
    console.error('Failed to send error notification email:', error);
  }
};

const sendPaymentStatusNotification = async (paymentData, status, clientData = null) => {
  try {
    const name = `${paymentData.metadata.customer_first_name} ${paymentData.metadata.customer_last_name}`
    const subject = `💳 Payment ${status.toUpperCase()} - ${name}`;
    
    const statusColor = {
      'success': '#28a745',
      'failed': '#dc3545',
      'abandoned': '#ffc107'
    };

    const statusEmoji = {
      'success': '✅',
      'failed': '❌',
      'abandoned': '⚠️'
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColor[status]}; border-bottom: 2px solid ${statusColor[status]}; padding-bottom: 10px;">
          ${statusEmoji[status]} Payment ${status.charAt(0).toUpperCase() + status.slice(1)} Notification
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Payment Information</h3>
          <p><strong>Reference:</strong> ${paymentData.reference}</p>
          <p><strong>Amount:</strong> ₦${(paymentData.amount / 100).toLocaleString()}</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor[status]}; font-weight: bold;">${status.toUpperCase()}</span></p>
          <p><strong>Date:</strong> ${new Date(paymentData.created_at).toLocaleString()}</p>
          ${paymentData.paid_at ? `<p><strong>Paid At:</strong> ${new Date(paymentData.paid_at).toLocaleString()}</p>` : ''}
        </div>

        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #495057; margin-top: 0;">Customer Details</h4>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${paymentData.customer.email}</p>
          <p><strong>Phone:</strong> ${paymentData.customer.phone || 'N/A'}</p>
        </div>

        ${clientData ? `
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">Therapy Session Details</h4>
          <p><strong>Selected Therapist:</strong> ${clientData.SelectedTherapist || 'N/A'}</p>
          <p><strong>Location:</strong> ${clientData.location || 'N/A'}</p>
          <p><strong>Meeting Type:</strong> ${clientData.meetingType || 'N/A'}</p>
          ${clientData.calendlyLink ? `<p><strong>Calendly Link:</strong> <a href="${clientData.calendlyLink}" style="color: #17a2b8;">${clientData.calendlyLink}</a></p>` : ''}
          ${clientData.discountCode ? `<p><strong>Discount Applied:</strong> ${clientData.discountName || clientData.discountCode}</p>` : ''}
        </div>
        ` : ''}

        ${status !== 'success' ? `
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h4 style="color: #721c24; margin-top: 0;">Action Required</h4>
          <p>This payment requires attention. Please follow up with the customer if necessary.</p>
          ${clientData?.SelectedTherapist ? `<p><strong>Therapist to Contact:</strong> ${clientData.SelectedTherapist}</p>` : ''}
        </div>
        ` : ''}
      </div>
    `;

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: SUPPORT_EMAILS,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`Payment ${status} notification email sent successfully`);
    
  } catch (error) {
    console.error('Failed to send payment notification email:', error);
  }
};

const sendPaymentSummaryEmail = async (summary) => {
  try {
    const { timeRange, totals, amounts, details } = summary;
    
    const fromDate = new Date(timeRange.from).toLocaleString();
    const toDate = new Date(timeRange.to).toLocaleString();
    
    const subject = `📊 EmpathySpace Consulting Payment Summary Report - Last ${timeRange.hoursBack} Hours (${totals.totalTransactions} transactions)`;

    // Calculate percentages
    const successRate = totals.totalTransactions > 0 ? ((totals.successful / totals.totalTransactions) * 100).toFixed(1) : 0;
    const failureRate = totals.totalTransactions > 0 ? ((totals.failed / totals.totalTransactions) * 100).toFixed(1) : 0;
    const abandonRate = totals.totalTransactions > 0 ? ((totals.abandoned / totals.totalTransactions) * 100).toFixed(1) : 0;

    // Helper function to format currency
    const formatAmount = (amount) => `₦${(amount / 100).toLocaleString()}`;

    // Generate payment tables
    const generatePaymentTable = (payments, status) => {
      if (payments.length === 0) {
        return `<p style="color: #6c757d; font-style: italic;">No ${status} payments in this period.</p>`;
      }

      const statusColors = {
        successful: '#28a745',
        failed: '#dc3545',
        abandoned: '#ffc107'
      };

      let table = `
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background-color: ${statusColors[status]}; color: white;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Customer</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Amount</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Therapist</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Type</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
              ${status === 'failed' ? '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reason</th>' : ''}
            </tr>
          </thead>
          <tbody>
      `;

      payments.forEach(payment => {
        table += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>${payment.customer}</strong><br>
              <small style="color: #6c757d;">${payment.email}</small>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatAmount(payment.amount)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payment.therapist}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payment.meetingType}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <small>${new Date(payment.date).toLocaleString()}</small>
            </td>
            ${status === 'failed' ? `<td style="padding: 8px; border: 1px solid #ddd;"><small>${payment.reason}</small></td>` : ''}
          </tr>
        `;
      });

      table += `
          </tbody>
        </table>
      `;

      return table;
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Payment Summary Report</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">
            ${fromDate} - ${toDate} (${timeRange.hoursBack} hours)
          </p>
        </div>

        <!-- Overview Cards -->
        <div style="display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px; background: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; color: #155724; font-size: 32px;">${totals.successful}</h3>
            <p style="margin: 5px 0 0 0; color: #155724;">✅ Successful</p>
            <small style="color: #28a745; font-weight: bold;">${successRate}%</small>
          </div>
          
          <div style="flex: 1; min-width: 150px; background: #f8d7da; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; color: #721c24; font-size: 32px;">${totals.failed}</h3>
            <p style="margin: 5px 0 0 0; color: #721c24;">❌ Failed</p>
            <small style="color: #dc3545; font-weight: bold;">${failureRate}%</small>
          </div>
          
          <div style="flex: 1; min-width: 150px; background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; color: #856404; font-size: 32px;">${totals.abandoned}</h3>
            <p style="margin: 5px 0 0 0; color: #856404;">⚠️ Abandoned</p>
            <small style="color: #ffc107; font-weight: bold;">${abandonRate}%</small>
          </div>
        </div>

        <!-- Financial Summary -->
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">💰 Financial Summary</h3>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
            <div>
              <p><strong>Successful Revenue:</strong> <span style="color: #28a745; font-weight: bold;">${formatAmount(amounts.totalSuccessful)}</span></p>
              <p><strong>Failed Amount:</strong> <span style="color: #dc3545;">${formatAmount(amounts.totalFailed)}</span></p>
              <p><strong>Abandoned Amount:</strong> <span style="color: #ffc107;">${formatAmount(amounts.totalAbandoned)}</span></p>
            </div>
            <div>
              <p><strong>Total Transactions:</strong> ${totals.totalTransactions}</p>
              <p><strong>Success Rate:</strong> ${successRate}%</p>
              <p><strong>Potential Lost Revenue:</strong> <span style="color: #dc3545;">${formatAmount(amounts.totalFailed + amounts.totalAbandoned)}</span></p>
            </div>
          </div>
        </div>

        <!-- Successful Payments -->
        <div style="margin: 30px 0;">
          <h3 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
            ✅ Successful Payments (${totals.successful})
          </h3>
          ${generatePaymentTable(details.successful, 'successful')}
        </div>

        <!-- Failed Payments -->
        ${totals.failed > 0 ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
            ❌ Failed Payments (${totals.failed}) - ACTION REQUIRED
          </h3>
          ${generatePaymentTable(details.failed, 'failed')}
          <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545;">
            <h4 style="color: #721c24; margin-top: 0;">⚠️ Action Required</h4>
            <p>These customers attempted to pay but failed. Consider reaching out to them:</p>
            <ul style="color: #721c24;">
              <li>Check if they need payment assistance</li>
              <li>Verify their contact information</li>
              <li>Offer alternative payment methods</li>
              <li>Follow up with their selected therapists</li>
            </ul>
          </div>
        </div>
        ` : ''}

        <!-- Abandoned Payments -->
        ${totals.abandoned > 0 ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #ffc107; border-bottom: 2px solid #ffc107; padding-bottom: 10px;">
            ⚠️ Abandoned Payments (${totals.abandoned})
          </h3>
          ${generatePaymentTable(details.abandoned, 'abandoned')}
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin-top: 0;">💡 Follow-up Suggestions</h4>
            <p>These customers started the payment process but didn't complete it:</p>
            <ul style="color: #856404;">
              <li>Send follow-up emails with payment links</li>
              <li>Check for technical issues in the payment flow</li>
              <li>Offer customer support for payment completion</li>
            </ul>
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; margin-top: 30px; text-align: center;">
          <p style="margin: 0; color: #6c757d;">
            <strong>Report generated:</strong> ${new Date().toLocaleString()}<br>
            <small>This report is automatically generated every ${timeRange.hoursBack} hours</small>
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.ZOHO_EMAIL,
      to: SUPPORT_EMAILS,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Payment summary email sent successfully (${totals.totalTransactions} transactions)`);
    
  } catch (error) {
    console.error('❌ Failed to send payment summary email:', error);
    throw error; // Re-throw so cron job can handle it
  }
};


module.exports = {
  sendErrorNotification,
  sendPaymentStatusNotification,
  sendPaymentSummaryEmail,
};