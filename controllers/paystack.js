require('dotenv').config();
const axios = require('axios');

const listPayments = async (req, res) => {
  try {
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    const response = await axios.get('http://api.paystack.co/transaction', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
     // Handle the response from Paystack API
     const { data } = response.data;
     // You can process 'data' here and extract payment status or other details
 
     res.status(200).json(data);

    // console.log('paystack payments', response.data);

  } catch (error) {
    console.error(`Error listing payments: ${error.message}`);
  }
};

module.exports = {
  listPayments,
};
