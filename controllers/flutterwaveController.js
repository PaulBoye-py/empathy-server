require('dotenv').config();
const Flutterwave = require('flutterwave-node-v3');

const verifyFlutterwavePayment = async (req, res) => {
    const { transaction_id } = req.query;

    try {
        let secretKey = ''
        if (process.env.ENVIRONMENT === 'production') {
            secretKey = process.env.FLW_SECRET_KEY
            publicKey = process.env.FLW_PUBLIC_KEY
        } else {
            secretKey = 'FLWSECK_TEST-985ac2a35c9b1ea13d028de52a560b2b-X'
            publicKey = 'FLWPUBK_TEST-0b829ab6812cc55cb0b9e4f5497b3591-X'
        }
        const flw = new Flutterwave(publicKey, secretKey);
        const response = await flw.Transaction.verify({ id: transaction_id });

        if (response.data.status === 'successful') {
            console.log('Payment verified Successfully. ID: ', transaction_id)
            return res.status(200).json({ success: true, message: 'Payment verified successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    verifyFlutterwavePayment,
};
