// require('dotenv').config();
// const axios = require('axios');

// const listPayments = async (req, res) => {
//   try {
//     const secretKey = process.env.ENVIRONMENT === 'production'
//       ? process.env.SECRET_KEY
//       : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

//     const response = await axios.get('http://api.paystack.co/transaction', {
//       headers: {
//         Authorization: `Bearer ${secretKey}`,
//       },
//     });
//      // Handle the response from Paystack API
//      const { data } = response.data;
//      // You can process 'data' here and extract payment status or other details
 
//      res.status(200).json(data);

//     // console.log('paystack payments', response.data);

//   } catch (error) {
//     console.error(`Error listing payments: ${error.message}`);
//   }
// };

// module.exports = {
//   listPayments,
// };

// controllers/paystack.js
require('dotenv').config();
const axios = require('axios');
const { sendPaymentStatusNotification } = require('../utils/emailService');
const { reportError } = require('../middleware/errorReporting');

const listPayments = async (req, res) => {
  try {
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    const response = await axios.get('https://api.paystack.co/transaction', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const { data } = response.data;
    res.status(200).json(data);

  } catch (error) {
    console.error(`Error listing payments: ${error.message}`);
    
    // Report this error to support team
    await reportError('Paystack API Error', error, {
      operation: 'listPayments',
      endpoint: 'https://api.paystack.co/transaction'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const { data } = response.data;
    console.log('verification data', data)

    if (!data) {
      throw new Error('No payment data received from Paystack');
    }

    // ✅ Extract session data from metadata (no redundant parameter needed)
    const sessionData = extractSessionDataFromMetadata(data);

    // ✅ IMPORTANT: Send response IMMEDIATELY, handle notifications asynchronously
    const responsePayload = {
      success: data.status === 'success',
      message: data.status === 'success' ? 'Payment verified successfully' : 'Payment verification failed',
      data: data
    };

    // Send response first (don't wait for email)
    res.status(200).json(responsePayload);

    // ✅ Handle notifications asynchronously (don't block response)
    if (data.status !== 'success') {
      // Send notification for failed verification (async)
      sendPaymentStatusNotification(data, data.status, sessionData)
        .catch(error => console.error('Failed to send failure notification:', error));
      
      // Report error (async)
      reportError('Payment Verification Failed', new Error(`Payment verification failed for reference: ${reference}`), {
        reference,
        status: data.status,
        paymentData: data,
        sessionData
      }).catch(error => console.error('Failed to report error:', error));
      
    } else {
      // ✅ REMOVE: Don't send notifications for successful payments (causes unnecessary delay)
      sendPaymentStatusNotification(data, 'success', sessionData);
      // Success notifications are not needed since payment worked
      console.log(`✅ Payment verified successfully: ${reference}`);
    }

  } catch (error) {
    console.error(`Error verifying payment: ${error.message}`);
    
    // Report error asynchronously (don't block response)
    reportError('Payment Verification Error', error, {
      operation: 'verifyPayment',
      reference: req.params.reference
    }).catch(reportingError => console.error('Failed to report error:', reportingError));

    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// ✅ SIMPLIFIED: Extract session data from metadata only (no redundant parameters)
const extractSessionDataFromMetadata = (paymentData) => {
  try {
    const metadata = paymentData.metadata;
    
    if (metadata && typeof metadata === 'object') {
      return {
        SelectedTherapist: metadata.therapist_name,
        location: metadata.location,
        meetingType: metadata.meeting_type,
        calendlyLink: metadata.calendly_link,
        discountCode: metadata.discount_code,
        discountName: metadata.discount_name,
        // Include customer info from metadata since customer object might be empty
        customerFirstName: metadata.customer_first_name,
        customerLastName: metadata.customer_last_name,
        customerLocation: metadata.customer_location
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting session data from metadata:', error);
    return null;
  }
};


// Updated webhook handler
const handlePaystackWebhook = async (req, res) => {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { event, data } = req.body;

    // Extract session data from webhook payload
    const sessionData = extractSessionDataFromMetadata(data);

    switch (event) {
      case 'charge.success':
        console.log('✅ Payment successful:', data.reference);
        // Send success notification with therapist info
        if (sessionData) {
          await sendPaymentStatusNotification(data, 'success', sessionData);
        }
        break;
        
      case 'charge.failed':
        console.log('❌ Payment failed:', data.reference);
        await sendPaymentStatusNotification(data, 'failed', sessionData);
        break;
        
      case 'charge.dispute.create':
        console.log('⚠️ Payment disputed:', data.reference);
        await sendPaymentStatusNotification(data, 'disputed', sessionData);
        break;

      default:
        console.log('📦 Unhandled webhook event:', event);
    }

    res.status(200).json({ message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    await reportError('Paystack Webhook Error', error, {
      operation: 'handlePaystackWebhook',
      event: req.body?.event
    });
    
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Improved Function to monitor and report on payment statuses
const monitorPaymentStatuses = async (req, res) => {
  try {
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    // Get all recent transactions first, then filter
    // Paystack API might not handle multiple status filters well
    const response = await axios.get('https://api.paystack.co/transaction', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      params: {
        perPage: 100, // Adjust as needed
        // Remove status filter - get all transactions and filter locally
      }
    });

    const { data } = response.data;
    
    if (data && Array.isArray(data)) {
      // Filter for failed and abandoned payments locally
      const failedPayments = data.filter(payment => payment.status === 'failed');
      const abandonedPayments = data.filter(payment => payment.status === 'abandoned');
      const allProblematicPayments = [...failedPayments, ...abandonedPayments];

      console.log(`Found ${data.length} total transactions`);
      console.log(`Failed: ${failedPayments.length}, Abandoned: ${abandonedPayments.length}`);

      // Send notifications for each failed/abandoned payment
      // if (allProblematicPayments.length > 0) {
      //   for (const payment of allProblematicPayments) {
      //     await sendPaymentStatusNotification(payment, payment.status);
      //   }
      // }

      res.status(200).json({
        success: true,
        message: 'Payment monitoring completed',
        summary: {
          totalProcessed: data.length,
          failed: failedPayments.length,
          abandoned: abandonedPayments.length,
          successful: data.filter(p => p.status === 'success').length
        },
        // Include some details for debugging
        recentProblematicPayments: allProblematicPayments.slice(0, 5).map(p => ({
          id: p.id,
          status: p.status,
          amount: p.amount,
          created_at: p.created_at,
          message: p.message || p.gateway_response
        }))
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'No transactions found'
      });
    }
  } catch (error) {
    console.error(`Error monitoring payment statuses: ${error.message}`);
    
    await reportError('Payment Monitoring Error', error, {
      operation: 'monitorPaymentStatuses'
    });
    
    res.status(500).json({
      success: false,
      message: 'Payment monitoring failed',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};


module.exports = {
  listPayments,
  verifyPayment,
  monitorPaymentStatuses,
  handlePaystackWebhook,
  extractSessionDataFromMetadata,
};