require('dotenv').config();
const axios = require('axios');
const { paymentLogger, logError } = require('../utils/logger');

const verifyPayment = async (req, res) => {
  const reference = req.params.reference;

  paymentLogger.info('Verify payment request received', { reference });

  if (!reference) {
    paymentLogger.warn('Payment reference missing', { route: 'verifyPayment' });
    return res.status(400).json({ success: false, message: 'Payment reference is required' });
  }

  try {
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`
        }
      }
    );

    const { data } = paystackResponse.data;

    paymentLogger.info('Paystack verification response received', {
      reference,
      status: data?.status,
      amount: data?.amount,
      currency: data?.currency,
      customerEmail: data?.customer?.email
    });

    res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    paymentLogger.error('Error verifying Paystack payment', {
      reference,
      error: errorMessage
    });
    logError(error, { operation: 'verifyPayment', reference });

    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: process.env.NODE_ENV === 'production' ? undefined : errorMessage
    });
  }
};

module.exports = {
  verifyPayment,
};
