// utils/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Support team emails
const SUPPORT_EMAILS = [
  'paul.adeboye@yahoo.com',
  'timiasha7@gmail.com',
  // 'estherapyhub@gmail.com',
  // 'asereopeyemimichael@gmail.com',
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

module.exports = {
  sendErrorNotification,
  sendPaymentStatusNotification
};