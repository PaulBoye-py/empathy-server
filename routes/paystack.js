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
const { triggerPaymentSummaryNow, getCronJobStatus } = require('../jobs/paymentSummaryJob');


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

module.exports = router;
