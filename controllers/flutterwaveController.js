require('dotenv').config();
const Flutterwave = require('flutterwave-node-v3');
const { paymentLogger, logError } = require('../utils/logger');

const verifyFlutterwavePayment = async (req, res) => {
  const { transaction_id } = req.query;

  paymentLogger.info('Flutterwave verification request received', {
    transaction_id
  });

  if (!transaction_id) {
    paymentLogger.warn('Missing Flutterwave transaction ID', {
      route: 'verifyFlutterwavePayment'
    });
    return res.status(400).json({ success: false, message: 'transaction_id is required' });
  }

  try {
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.FLW_SECRET_KEY
      : 'FLWSECK_TEST-985ac2a35c9b1ea13d028de52a560b2b-X';
    const publicKey = process.env.ENVIRONMENT === 'production'
      ? process.env.FLW_PUBLIC_KEY
      : 'FLWPUBK_TEST-0b829ab6812cc55cb0b9e4f5497b3591-X';

    const flw = new Flutterwave(publicKey, secretKey);
    const response = await flw.Transaction.verify({ id: transaction_id });

    paymentLogger.info('Flutterwave verification API response', {
      transaction_id,
      status: response?.data?.status,
      responseCode: response?.data?.code
    });

    if (response.data.status === 'successful') {
      paymentLogger.info('Flutterwave payment verified successfully', {
        transaction_id
      });
      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    }

    paymentLogger.warn('Flutterwave payment verification failed', {
      transaction_id,
      response: response.data
    });
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  } catch (error) {
    paymentLogger.error('Flutterwave verification error', {
      transaction_id,
      error: error.message
    });
    logError(error, { operation: 'verifyFlutterwavePayment', transaction_id });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  verifyFlutterwavePayment,
};
