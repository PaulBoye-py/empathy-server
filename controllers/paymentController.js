require('dotenv').config();
const axios = require('axios');

const verifyPayment = async (req, res) => {
  const reference = req.params.reference;

  try {
    let secretKey = '';

    if (process.env.ENVIRONMENT === 'production') {
      secretKey = process.env.SECRET_KEY;
    } else {
      secretKey = 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';
    }

    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`, // Replace with your Paystack secret key
        },
      }
    );

    // Handle the response from Paystack API
    const { data } = paystackResponse.data;
    // You can process 'data' here and extract payment status or other details

    console.log('Success, Reference:', data.status);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error verifying payment:', error.response.data);
    res.status(500).send('Error verifying payment');
  }
};

module.exports = {
  verifyPayment,
};
