const express = require('express');
const router = express.Router()
const squadController = require('../controllers/squadController');
const { asyncErrorHandler } = require('../middleware/errorReporting');
const { 
  triggerPaymentSummaryNow, 
  getCronJobStatus, 
  scheduleTestJob,
  paymentSummaryJob 
} = require('../jobs/paymentSummaryJob');


router.post('/process', asyncErrorHandler(squadController.processSquadPayment));

// router.post('/summary', asyncErrorHandler(squadController.generatePaymentsSummaryReport));
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

module.exports = router;


