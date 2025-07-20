const express = require('express');
const router = express.Router();
const { sendErrorNotification } = require('../utils/emailService');
const { asyncErrorHandler } = require('../middleware/errorReporting');

// Route to receive error reports from frontend
router.post('/report', asyncErrorHandler(async (req, res) => {
  const { errorType, errorDetails, clientData } = req.body;

  if (!errorType || !errorDetails) {
    return res.status(400).json({
      success: false,
      message: 'Error type and details are required'
    });
  }

  // Send error notification email
  await sendErrorNotification(errorType, errorDetails, clientData);

  res.status(200).json({
    success: true,
    message: 'Error reported successfully'
  });
}));

module.exports = router;