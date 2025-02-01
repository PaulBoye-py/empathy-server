const express = require('express');
const router = express.Router();
const flutterwaveController = require('../controllers/flutterwaveController');

router.get('/flutterwave-verify-payment', flutterwaveController.verifyFlutterwavePayment);

module.exports = router;
