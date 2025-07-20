// middleware/errorReporting.js
const { sendErrorNotification } = require('../utils/emailService');

// Middleware to catch and report errors
const errorReportingMiddleware = (err, req, res, next) => {
  // Log error to console
  console.error('Error caught by middleware:', err);

  // Prepare error details for email
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  };

  // Send error notification email (don't await to avoid blocking response)
  sendErrorNotification('API Error', errorDetails, req.user || null)
    .catch(emailError => {
      console.error('Failed to send error notification:', emailError);
    });

  // Send error response
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Support team has been notified.' 
      : err.message,
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

// Function to manually report errors
const reportError = async (errorType, error, additionalData = {}, clientData = null) => {
  try {
    const errorDetails = {
      message: error.message || error,
      stack: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    await sendErrorNotification(errorType, errorDetails, clientData);
  } catch (emailError) {
    console.error('Failed to report error:', emailError);
  }
};

// Async error handler wrapper
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorReportingMiddleware,
  reportError,
  asyncErrorHandler
};