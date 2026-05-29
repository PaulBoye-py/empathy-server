require('dotenv').config();
const axios = require('axios');
const { sendPaymentStatusNotification } = require('../utils/emailService');
const { reportError } = require('../middleware/errorReporting');
const { paymentLogger, logError } = require('../utils/logger');

const listPayments = async (req, res) => {
  const { page = 1, perPage = 100 } = req.query;
  paymentLogger.info('Listing Paystack payments', { page, perPage });
  try {
    const { page = 1, perPage = 100 } = req.query;
    
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    const response = await axios.get('https://api.paystack.co/transaction', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      params: {
        page,
        perPage
      }
    });

    const { data } = response.data;
    res.status(200).json(data);

  } catch (error) {
    paymentLogger.error('Error listing Paystack payments', {
      page,
      perPage,
      error: error.message,
      stack: error.stack
    });

    logError(error, { operation: 'listPayments', endpoint: 'https://api.paystack.co/transaction' });

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

    if (!data) {
      paymentLogger.warn('Paystack verification returned no payment data', { reference });
      throw new Error('No payment data received from Paystack');
    }

    const sessionData = extractSessionDataFromMetadata(data);
    paymentLogger.info('Paystack verification completed', {
      reference,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      customerEmail: data.customer?.email
    });

    const responsePayload = {
      success: data.status === 'success',
      message: data.status === 'success' ? 'Payment verified successfully' : 'Payment verification failed',
      data
    };

    res.status(200).json(responsePayload);

    if (data.status !== 'success') {
      sendPaymentStatusNotification(data, data.status, sessionData)
        .catch(error => paymentLogger.error('Failed to send failure notification', {
          reference,
          error: error.message
        }));

      reportError('Payment Verification Failed', new Error(`Payment verification failed for reference: ${reference}`), {
        reference,
        status: data.status,
        paymentData: data,
        sessionData
      }).catch(error => paymentLogger.error('Failed to report payment verification failure', {
        reference,
        error: error.message
      }));
    } else {
      sendPaymentStatusNotification(data, 'success', sessionData)
        .catch(error => paymentLogger.warn('Failed to send success notification', {
          reference,
          error: error.message
        }));
      paymentLogger.info('Payment verified successfully', { reference });
    }

  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    paymentLogger.error('Error verifying Paystack payment', {
      reference,
      error: errorMessage
    });

    reportError('Payment Verification Error', error, {
      operation: 'verifyPayment',
      reference: req.params.reference
    }).catch(reportingError => paymentLogger.error('Failed to report payment verification error', {
      reference,
      error: reportingError.message
    }));

    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'production' ? undefined : errorMessage
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
        customerFirstName: metadata.customer_first_name || paymentData.first_name,
        customerLastName: metadata.customer_last_name || paymentData.last_name,
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
    const sessionData = extractSessionDataFromMetadata(data);
    paymentLogger.info('Received Paystack webhook', {
      event,
      reference: data?.reference,
      status: data?.status,
      amount: data?.amount
    });

    switch (event) {
      case 'charge.success':
        paymentLogger.info('Paystack charge.success event', {
          reference: data.reference
        });
        if (sessionData) {
          await sendPaymentStatusNotification(data, 'success', sessionData);
        }
        break;

      case 'charge.failed':
        paymentLogger.warn('Paystack charge.failed event', {
          reference: data.reference
        });
        await sendPaymentStatusNotification(data, 'failed', sessionData);
        break;

      case 'charge.dispute.create':
        paymentLogger.warn('Paystack charge.dispute.create event', {
          reference: data.reference
        });
        await sendPaymentStatusNotification(data, 'disputed', sessionData);
        break;

      default:
        paymentLogger.info('Unhandled Paystack webhook event', { event });
    }

    res.status(200).json({ message: 'Webhook processed' });

  } catch (error) {
    paymentLogger.error('Paystack webhook processing error', {
      error: error.message,
      event: req.body?.event
    });
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
    paymentLogger.error('Error monitoring payment statuses', {
      error: error.message,
      stack: error.stack
    });
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

const getPaymentsSummary = async (hoursBack = 12) => {
  try {
    const secretKey = process.env.ENVIRONMENT === 'production'
      ? process.env.SECRET_KEY
      : 'sk_test_29c86c6683f85c4badd6f0459fe30b766f798903';

    // Calculate time range (last 12 hours)
    const now = new Date();
    const hoursAgo = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    
    // Get payments from Paystack
    const response = await axios.get('https://api.paystack.co/transaction', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      params: {
        perPage: 200, // Get more records to ensure we catch all in timeframe
        from: hoursAgo.toISOString(),
        to: now.toISOString()
      }
    });

    const { data } = response.data;
    
    if (!data || !Array.isArray(data)) {
      return {
        success: false,
        message: 'No payment data received',
        summary: null
      };
    }

    // Filter payments within the last X hours (additional client-side filtering)
    const recentPayments = data.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      return paymentDate >= hoursAgo && paymentDate <= now;
    });

    // Stratify payments by status
    const successfulPayments = recentPayments.filter(p => p.status === 'success');
    const failedPayments = recentPayments.filter(p => p.status === 'failed');
    const abandonedPayments = recentPayments.filter(p => p.status === 'abandoned');
    const otherPayments = recentPayments.filter(p => !['success', 'failed', 'abandoned'].includes(p.status));

    // Calculate totals
    const totalAmount = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const failedAmount = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const abandonedAmount = abandonedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Extract therapist information
    const getTherapistInfo = (payment) => {
      const metadata = payment.metadata || {};
      return {
        therapist: metadata.therapist_name || 'Unknown',
        meetingType: metadata.meeting_type || 'N/A',
        location: metadata.location || 'N/A'
      };
    };

    const summary = {
      timeRange: {
        from: hoursAgo.toISOString(),
        to: now.toISOString(),
        hoursBack
      },
      totals: {
        totalTransactions: recentPayments.length,
        successful: successfulPayments.length,
        failed: failedPayments.length,
        abandoned: abandonedPayments.length,
        other: otherPayments.length
      },
      amounts: {
        totalSuccessful: totalAmount,
        totalFailed: failedAmount,
        totalAbandoned: abandonedAmount,
        currency: 'NGN'
      },
      details: {
        successful: successfulPayments.map(payment => ({
          reference: payment.reference,
          amount: payment.amount,
          customer: `${payment.metadata?.customer_first_name || ''} ${payment.metadata?.customer_last_name || ''}`.trim() || 'Unknown',
          email: payment.customer?.email || 'N/A',
          date: payment.created_at,
          ...getTherapistInfo(payment)
        })),
        failed: failedPayments.map(payment => ({
          reference: payment.reference,
          amount: payment.amount,
          customer: `${payment.metadata?.customer_first_name || ''} ${payment.metadata?.customer_last_name || ''}`.trim() || 'Unknown',
          email: payment.customer?.email || 'N/A',
          date: payment.created_at,
          reason: payment.gateway_response || 'Unknown',
          ...getTherapistInfo(payment)
        })),
        abandoned: abandonedPayments.map(payment => ({
          reference: payment.reference,
          amount: payment.amount,
          customer: `${payment.metadata?.customer_first_name || ''} ${payment.metadata?.customer_last_name || ''}`.trim() || 'Unknown',
          email: payment.customer?.email || 'N/A',
          date: payment.created_at,
          ...getTherapistInfo(payment)
        }))
      }
    };

    return {
      success: true,
      summary,
      rawData: recentPayments
    };

  } catch (error) {
    paymentLogger.error('Error getting Paystack payments summary', {
      hoursBack,
      error: error.message,
      stack: error.stack
    });
    await reportError('Payment Summary Error', error, {
      operation: 'getPaymentsSummary',
      hoursBack
    });

    return {
      success: false,
      message: error.message,
      summary: null
    };
  }
};

// Route handler for manual summary
const generatePaymentsSummaryReport = async (req, res) => {
  try {
    const hoursBack = parseInt(req.query.hours) || 12;
    const result = await getPaymentsSummary(hoursBack);
    
    if (result.success) {
      // Send email summary
      await sendPaymentSummaryEmail(result.summary);
      
      res.status(200).json({
        success: true,
        message: `Payment summary for last ${hoursBack} hours generated and sent`,
        summary: result.summary
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    paymentLogger.error('Error generating payment summary report', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment summary'
    });
  }
};


module.exports = {
  listPayments,
  verifyPayment,
  monitorPaymentStatuses,
  handlePaystackWebhook,
  extractSessionDataFromMetadata,
  getPaymentsSummary,
  generatePaymentsSummaryReport,
};