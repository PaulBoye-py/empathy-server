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

// Wrap routes with error handling
// router.get('/verifyPayment/:reference', asyncErrorHandler(paymentController.verifyPayment));
router.get('/listPayment', asyncErrorHandler(paystackController.listPayments));
router.get('/verifyPayment/:reference', asyncErrorHandler(paystackController.verifyPayment));
router.post('/monitor', asyncErrorHandler(paystackController.monitorPaymentStatuses));

module.exports = router;
