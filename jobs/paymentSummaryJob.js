// jobs/paymentSummaryJob.js
const cron = require('node-cron');
const { getPaymentsSummary } = require('../controllers/paystack');
const { sendPaymentSummaryEmail } = require('../utils/emailService');
const { reportError } = require('../middleware/errorReporting');

// Payment summary job function
const runPaymentSummaryJob = async () => {
  const startTime = new Date();
  console.log(`🕐 [${startTime.toLocaleString()}] Starting 12-hour payment summary job...`);
  
  try {
    // Get payment summary for last 12 hours
    const result = await getPaymentsSummary(12);
    
    if (result.success) {
      const { summary } = result;
      
      // Log summary to console
      console.log(`📊 Payment Summary (Last 12 hours):`);
      console.log(`   Total Transactions: ${summary.totals.totalTransactions}`);
      console.log(`   ✅ Successful: ${summary.totals.successful}`);
      console.log(`   ❌ Failed: ${summary.totals.failed}`);
      console.log(`   ⚠️ Abandoned: ${summary.totals.abandoned}`);
      console.log(`   💰 Revenue: ₦${(summary.amounts.totalSuccessful / 100).toLocaleString()}`);
      
      // Send email summary
      await sendPaymentSummaryEmail(summary);
      
      const endTime = new Date();
      const duration = endTime - startTime;
      console.log(`✅ [${endTime.toLocaleString()}] Payment summary job completed successfully (${duration}ms)`);
      
    } else {
      throw new Error(`Failed to get payment summary: ${result.message}`);
    }
    
  } catch (error) {
    console.error(`❌ [${new Date().toLocaleString()}] Payment summary job failed:`, error.message);
    
    // Report the cron job error
    await reportError('Payment Summary Cron Job Error', error, {
      operation: 'runPaymentSummaryJob',
      scheduledTime: startTime.toISOString(),
      jobType: '12-hour-summary'
    }).catch(reportingError => {
      console.error('Failed to report cron job error:', reportingError);
    });
  }
};

// Schedule the cron job to run every 12 hours
// Cron pattern: '0 */12 * * *' means "at minute 0 of every 12th hour"
// This will run at 12:00 AM and 12:00 PM every day
const schedulePaymentSummaryJob = () => {
  console.log('🚀 Scheduling payment summary cron job (every 12 hours)...');
  
  // Run every 12 hours at the top of the hour
  cron.schedule('0 */12 * * *', runPaymentSummaryJob, {
    scheduled: true,
    timezone: "Africa/Lagos" // Adjust to your timezone
  });
  
  console.log('✅ Payment summary cron job scheduled successfully');
  console.log('   Schedule: Every 12 hours (12:00 AM and 12:00 PM)');
  console.log('   Timezone: Africa/Lagos');
  console.log('   Next run times will be logged when they execute');
};

// Manual trigger for testing
const triggerPaymentSummaryNow = async () => {
  console.log('🧪 Manually triggering payment summary job...');
  await runPaymentSummaryJob();
};

// Alternative schedules (comment/uncomment as needed)
const alternativeSchedules = {
  // Every 6 hours
  every6Hours: () => cron.schedule('0 */6 * * *', runPaymentSummaryJob),
  
  // Every day at 9 AM and 9 PM
  twiceDaily: () => cron.schedule('0 9,21 * * *', runPaymentSummaryJob),
  
  // Every hour (for testing)
  hourly: () => cron.schedule('0 * * * *', runPaymentSummaryJob),
  
  // Every 30 minutes (for development/testing)
  every30Minutes: () => cron.schedule('*/30 * * * *', runPaymentSummaryJob),
  
  // Every weekday at 9 AM and 5 PM
  businessHours: () => cron.schedule('0 9,17 * * 1-5', runPaymentSummaryJob)
};

// Health check for cron jobs
const getCronJobStatus = () => {
  return {
    paymentSummaryJob: {
      scheduled: true,
      pattern: '0 */12 * * *',
      description: 'Payment summary every 12 hours',
      timezone: 'Africa/Lagos',
      lastRun: null, // You can track this if needed
      nextRun: cron.getTasks().size > 0 ? 'Scheduled' : 'Not scheduled'
    }
  };
};

module.exports = {
  schedulePaymentSummaryJob,
  runPaymentSummaryJob,
  triggerPaymentSummaryNow,
  getCronJobStatus,
  alternativeSchedules
};

// ==============================================
// app.js or server.js - Add this to your main server file
// ==============================================

/*
// Add this to your main server file (app.js or server.js)
const { schedulePaymentSummaryJob } = require('./jobs/paymentSummaryJob');

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Schedule cron jobs after server starts
  schedulePaymentSummaryJob();
});
*/