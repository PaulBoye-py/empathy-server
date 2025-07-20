// test-email-connection.js
// Run this script to diagnose email connection issues
// Usage: node test-email-connection.js

require('dotenv').config();
const nodemailer = require('nodemailer');

const SUPPORT_EMAILS = [
  'paul.adeboye@yahoo.com',
//   'timiasha7@gmail.com', 
//   'estherapyhub@gmail.com'
];

console.log('🔍 Diagnosing email connection...\n');

// Step 1: Check environment variables
console.log('1️⃣ Environment Variables:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASS length:', process.env.EMAIL_PASS?.length || '❌ NOT SET');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('❌ ERROR: Missing EMAIL_USER or EMAIL_PASS in environment variables');
  console.log('💡 Fix: Add these to your .env file:');
  console.log('   EMAIL_USER=your-email@gmail.com');
  console.log('   EMAIL_PASS=your-16-character-app-password');
  process.exit(1);
}

// Step 2: Test different SMTP configurations
const configs = [
  {
    name: 'Gmail Service (Recommended)',
    config: {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    }
  },
  {
    name: 'Gmail SMTP Port 587',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    }
  },
  {
    name: 'Gmail SMTP Port 465',
    config: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    }
  },
  {
    name: 'Gmail SMTP Port 25',
    config: {
      host: 'smtp.gmail.com',
      port: 25,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  }
];

const testConfigurations = async () => {
  console.log('2️⃣ Testing SMTP Configurations:\n');
  
  let workingConfig = null;
  
  for (const { name, config } of configs) {
    try {
      console.log(`   Testing: ${name}...`);
      const transporter = nodemailer.createTransport(config);
      
      // Test connection with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );
      
      await Promise.race([
        transporter.verify(),
        timeoutPromise
      ]);
      
      console.log(`   ✅ ${name} - Connection successful!`);
      workingConfig = { name, config, transporter };
      break;
      
    } catch (error) {
      console.log(`   ❌ ${name} - Failed: ${error.message}`);
    }
  }
  
  return workingConfig;
};

const sendTestEmail = async (transporter, configName) => {
  console.log('\n3️⃣ Sending Test Email:\n');
  
  try {
    const testEmailContent = `
      <h2>🧪 Email Connection Test</h2>
      <p>This is a test email from your Therapy Hub server.</p>
      <p><strong>Configuration:</strong> ${configName}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Status:</strong> ✅ Email system is working correctly!</p>
      <hr>
      <small>This test was run from test-email-connection.js</small>
    `;
    
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: SUPPORT_EMAILS,
      subject: '🧪 Email System Test - Therapy Hub',
      html: testEmailContent
    });
    
    console.log('   ✅ Test email sent successfully!');
    console.log('   📧 Message ID:', result.messageId);
    console.log('   📬 Sent to:', SUPPORT_EMAILS.join(', '));
    console.log('\n🎉 EMAIL SYSTEM IS WORKING! Check your inboxes.');
    
    return true;
    
  } catch (error) {
    console.log('   ❌ Failed to send test email:', error.message);
    return false;
  }
};

const provideSolutions = (workingConfig) => {
  console.log('\n4️⃣ Recommendations:\n');
  
  if (workingConfig) {
    console.log('✅ GOOD NEWS: Email connection is working!');
    console.log(`   Best configuration: ${workingConfig.name}`);
    console.log('\n💡 Update your emailService.js with this working configuration:');
    console.log('\n```javascript');
    console.log('const transporter = nodemailer.createTransporter({');
    console.log('  ' + JSON.stringify(workingConfig.config, null, 2).replace(/\n/g, '\n  '));
    console.log('});');
    console.log('```\n');
  } else {
    console.log('❌ NO WORKING CONFIGURATION FOUND');
    console.log('\n🔧 Try these solutions:');
    console.log('\n1. Gmail App Password Setup:');
    console.log('   • Enable 2-factor authentication on Gmail');
    console.log('   • Generate app password: https://myaccount.google.com/apppasswords');
    console.log('   • Use the 16-character password (no spaces)');
    console.log('\n2. Check Network/Firewall:');
    console.log('   • Ensure outbound SMTP connections are allowed');
    console.log('   • Try from different network if possible');
    console.log('\n3. Alternative Email Services:');
    console.log('   • SendGrid: https://sendgrid.com');
    console.log('   • Mailgun: https://mailgun.com');
    console.log('   • AWS SES: https://aws.amazon.com/ses');
    console.log('\n4. Gmail Account Settings:');
    console.log('   • Check if account is locked or restricted');
    console.log('   • Try signing in from server location');
  }
};

const runDiagnostics = async () => {
  try {
    const workingConfig = await testConfigurations();
    
    if (workingConfig) {
      const emailSent = await sendTestEmail(workingConfig.transporter, workingConfig.name);
      if (!emailSent) {
        console.log('\n⚠️  Connection works but email sending failed');
      }
    }
    
    provideSolutions(workingConfig);
    
  } catch (error) {
    console.error('\n💥 Unexpected error during diagnostics:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Diagnostics complete. Check the recommendations above.');
  console.log('='.repeat(60));
};

// Run diagnostics
runDiagnostics();