require('dotenv').config();
const axios = require('axios');
const { Squad, SquadError } = require('@padar-labs/squad-ts');
const { sendPaymentStatusNotification, sendCustomerFollowUpEmail } = require('../utils/emailService');
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

    // Send individual follow-up emails to each failed/abandoned customer
    const followUpTargets = [
      ...failedPayments.map(p => ({ payment: p, status: 'failed' })),
      ...abandonedPayments.map(p => ({ payment: p, status: 'abandoned' })),
    ];

    for (const { payment, status: pStatus } of followUpTargets) {
      const email = payment.customer?.email;
      const firstName = payment.metadata?.customer_first_name || '';
      const lastName = payment.metadata?.customer_last_name || '';
      const customerName = `${firstName} ${lastName}`.trim() || 'Valued Client';
      const reason = payment.gateway_response || 'Unknown';
      sendCustomerFollowUpEmail(email, customerName, pStatus, { reason }).catch(err =>
        paymentLogger.error('Failed to send customer follow-up', { email, error: err.message })
      );
    }

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


// Squad's transaction-listing endpoint isn't in their current public docs
// (only their old, deprecated GitBook docs mention it) and publishes no rate
// limit numbers anywhere — but it 429s intermittently even at our low call
// volume (once per 12h). A single delayed retry smooths over that transient
// throttle without hammering Squad further; if it still fails, the caller's
// existing error handling takes over.
const getAllTransactionsWithRetry = async (squadClient, params, retries = 1, delayMs = 60000) => {
  try {
    return await squadClient.payments.getAllTransactions(params);
  } catch (error) {
    if (error instanceof SquadError && error.statusCode === 429 && retries > 0) {
      paymentLogger.warn('Squad rate-limited getAllTransactions — retrying after delay', {
        delayMs,
        retriesLeft: retries,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return getAllTransactionsWithRetry(squadClient, params, retries - 1, delayMs);
    }
    throw error;
  }
};

const getSquadPaymentsSummary = async (hoursBack = 12) => {
  try {
    const squadClient = new Squad({
      secretKey: process.env.SQUAD_SECRET_KEY,
      environment: process.env.SQUAD_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
    });

    const now = new Date();
    const hoursAgo = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

    // Squad date params are YYYY-MM-DD strings; fetch a day window to be safe
    const startDate = hoursAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const response = await getAllTransactionsWithRetry(squadClient, {
      perPage: 200,
      start_date: startDate,
      end_date: endDate,
    });

    const rows = response?.data?.rows || [];

    const recentRows = rows.filter(t => {
      const d = new Date(t.created_at);
      return d >= hoursAgo && d <= now;
    });

    const successfulPayments = recentRows.filter(t => t.transaction_status?.toLowerCase() === 'success');
    const failedPayments     = recentRows.filter(t => t.transaction_status?.toLowerCase() === 'failed');
    const abandonedPayments  = recentRows.filter(t => t.transaction_status?.toLowerCase() === 'abandoned');

    const toDetail = t => {
      const meta = t.meta || {};
      return {
        reference: t.transaction_ref,
        amount: t.amount,
        customer: `${meta.customerFirstName || ''} ${meta.customerLastName || ''}`.trim() || 'Unknown',
        email: t.email || 'N/A',
        therapist: meta.SelectedTherapist || 'Unknown',
        meetingType: meta.meetingType || 'N/A',
        location: meta.location || 'N/A',
        date: t.created_at,
      };
    };

    // Send individual follow-up emails to failed/abandoned Squad customers
    const followUpTargets = [
      ...failedPayments.map(t => ({ t, status: 'failed' })),
      ...abandonedPayments.map(t => ({ t, status: 'abandoned' })),
    ];

    for (const { t, status: pStatus } of followUpTargets) {
      const meta = t.meta || {};
      const email = t.email;
      const customerName = `${meta.customerFirstName || ''} ${meta.customerLastName || ''}`.trim() || 'Valued Client';
      sendCustomerFollowUpEmail(email, customerName, pStatus, {}).catch(err =>
        paymentLogger.error('Failed to send Squad customer follow-up', { email, error: err.message })
      );
    }

    const summary = {
      timeRange: { from: hoursAgo.toISOString(), to: now.toISOString(), hoursBack },
      totals: {
        totalTransactions: recentRows.length,
        successful: successfulPayments.length,
        failed: failedPayments.length,
        abandoned: abandonedPayments.length,
      },
      amounts: {
        totalSuccessful: successfulPayments.reduce((s, t) => s + (t.amount || 0), 0),
        totalFailed: failedPayments.reduce((s, t) => s + (t.amount || 0), 0),
        totalAbandoned: abandonedPayments.reduce((s, t) => s + (t.amount || 0), 0),
        currency: 'USD',
      },
      details: {
        successful: successfulPayments.map(toDetail),
        failed: failedPayments.map(toDetail),
        abandoned: abandonedPayments.map(toDetail),
      },
    };

    return { success: true, summary };
  } catch (error) {
    // Squad's /transaction endpoint returns a 404 "no transaction found"
    // instead of 200 + an empty list when nothing matches the window — that's
    // not a failure, just zero Squad transactions in this period.
    if (error instanceof SquadError && error.statusCode === 404) {
      const now = new Date();
      const hoursAgo = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
      return {
        success: true,
        summary: {
          timeRange: { from: hoursAgo.toISOString(), to: now.toISOString(), hoursBack },
          totals: { totalTransactions: 0, successful: 0, failed: 0, abandoned: 0 },
          amounts: { totalSuccessful: 0, totalFailed: 0, totalAbandoned: 0, currency: 'USD' },
          details: { successful: [], failed: [], abandoned: [] },
        },
      };
    }

    paymentLogger.error('Error getting Squad payments summary', {
      hoursBack,
      error: error.message,
      stack: error.stack,
    });

    // Unlike the empty-result case above, this is a genuine failure (auth,
    // network, etc.) — worth an actual notification since it otherwise fails silently.
    reportError('Squad Payments Summary Error', error, {
      operation: 'getSquadPaymentsSummary',
      hoursBack,
    }).catch(reportingError => {
      paymentLogger.error('Failed to report Squad payments summary error', {
        reportingError: reportingError.message,
      });
    });

    return { success: false, message: error.message, summary: null };
  }
};

module.exports = {
  listPayments,
  verifyPayment,
  monitorPaymentStatuses,
  handlePaystackWebhook,
  extractSessionDataFromMetadata,
  getPaymentsSummary,
  getSquadPaymentsSummary,
  generatePaymentsSummaryReport,
};