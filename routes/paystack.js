// // routes/paystack.js (Your current version)
// const express = require('express');
// const router = express.Router();
// const paymentController = require('../controllers/paymentController');
// const listPayment = require('../controllers/paystack');

// router.get('/verifyPayment/:reference', paymentController.verifyPayment);
// router.get('/listPayment', listPayment.listPayments);

// module.exports = router;

// Updated routes/paystack.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const paystackController = require('../controllers/paystack');
const { asyncErrorHandler } = require('../middleware/errorReporting');
// const { triggerPaymentSummaryNow, getCronJobStatus } = require('../jobs/paymentSummaryJob');
const { 
  triggerPaymentSummaryNow, 
  getCronJobStatus, 
  scheduleTestJob,
  paymentSummaryJob 
} = require('../jobs/paymentSummaryJob');


// Wrap routes with error handling
// router.get('/verifyPayment/:reference', asyncErrorHandler(paymentController.verifyPayment));
router.get('/listPayment', asyncErrorHandler(paystackController.listPayments));
router.get('/verifyPayment/:reference', asyncErrorHandler(paystackController.verifyPayment));
router.post('/monitor', asyncErrorHandler(paystackController.monitorPaymentStatuses));

//Payment summary routes
router.post('/summary', asyncErrorHandler(paystackController.generatePaymentsSummaryReport));
router.post('/summary/trigger', asyncErrorHandler(async (req, res) => {
  try {
    await triggerPaymentSummaryNow();
    res.json({ 
      success: true, 
      message: 'Payment summary job triggered successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: `Summary job failed: ${error.message}` 
    });
  }
}));

router.get('/summary/status', (req, res) => {
  const status = getCronJobStatus();
  res.json({ success: true, cronJobs: status });
});

// Get detailed cron job status
router.get('/cron/status', (req, res) => {
  try {
    const status = getCronJobStatus();
    res.json({ 
      success: true, 
      cronStatus: status,
      debug: {
        nodeVersion: process.version,
        platform: process.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentUTC: new Date().toISOString(),
        currentLocal: new Date().toLocaleString()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manual trigger with detailed response
router.post('/cron/trigger', asyncErrorHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    await triggerPaymentSummaryNow();
    const duration = Date.now() - startTime;
    
    res.json({ 
      success: true, 
      message: 'Payment summary job executed successfully',
      execution: {
        duration: `${duration}ms`,
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'manual'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    res.status(500).json({ 
      success: false, 
      message: `Payment summary job failed: ${error.message}`,
      execution: {
        duration: `${duration}ms`,
        error: error.message,
        triggeredAt: new Date().toISOString()
      }
    });
  }
}));

// Start test cron job (runs every 5 minutes)
router.post('/cron/test', (req, res) => {
  try {
    scheduleTestJob();
    res.json({ 
      success: true, 
      message: 'Test cron job started (runs every 5 minutes)',
      note: 'Check logs for "🧪 Test cron job executed" messages'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Restart the payment summary cron job
router.post('/cron/restart', (req, res) => {
  try {
    paymentSummaryJob.stopScheduledJob();
    setTimeout(() => {
      paymentSummaryJob.schedulePaymentSummaryJob();
    }, 1000);
    
    res.json({ 
      success: true, 
      message: 'Payment summary cron job restarted',
      nextCheck: 'Call GET /api/v1/payment/cron/status to verify'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if server has restarted recently
router.get('/cron/uptime', (req, res) => {
  const uptimeSeconds = process.uptime();
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  
  const startTime = new Date(Date.now() - uptimeSeconds * 1000);
  
  res.json({
    success: true,
    uptime: {
      seconds: Math.floor(uptimeSeconds),
      minutes: uptimeMinutes,
      hours: uptimeHours,
      human: `${uptimeHours}h ${uptimeMinutes % 60}m ${Math.floor(uptimeSeconds % 60)}s`,
      serverStartedAt: startTime.toISOString(),
      serverStartedLocal: startTime.toLocaleString()
    },
    warning: uptimeMinutes < 60 ? 'Server restarted recently - cron jobs may have been cancelled' : null
  });
});


module.exports = router;
