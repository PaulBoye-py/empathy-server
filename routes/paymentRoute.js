const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController')
const listPayment = require('../controllers/paystack')

router.get('/verifyPayment/:reference', paymentController.verifyPayment)

router.get('/listPayment', listPayment.listPayments)

module.exports = router;