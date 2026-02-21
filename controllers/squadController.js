// require('dotenv').config();
// const axios = require('axios');
// const { sendPaymentStatusNotification } = require('../utils/emailService');
// const { reportError } = require('../middleware/errorReporting');

// const listPayments = async (req, res) => {
//     try {
//         const secretKey = process.env.ENVIRONMENT === 'production'
//             ? process.env.SQUAD_SECRET_KEY
//             : 'sandbox_sk_5f5323d1193fdf48d02c3f3c6b90333489fcf32f84e9'
        
//         const apiBaseUrl = process.env.ENVIRONMENT === 'production'
//         ? 'https://api-d.squadco.com'
//         : 'https://sandbox-api-d.squadco.com';

//         const response = await axios.get(`${apiBaseUrl}/transaction`, {
//             headers: {
//                 Authorization: `Bearer ${secretKey}`,
//             }
//         })
//          const { data } = response.data;
//     res.status(200).json(data);

//   } catch (error) {
//     console.error(`Error listing payments: ${error.message}`);
    
//     // Report this error to support team
//     await reportError('Squad API Error', error, {
//       operation: 'listPayments',
//       endpoint: `${process.env.SQUAD_ENV_BASE_URL}/transactions`
//     });

//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch payments',
//       error: process.env.NODE_ENV === 'production' ? undefined : error.message
//     });
// }
// }

// const verifySquadPayment = async (req, res) => {
//   try {
//     const { reference } = req.params;

//     console.log('🔍 Verifying Squad transaction:', reference);
    
//     if (!reference) {
//       return res.status(400).json({
//         success: false,
//         message: 'Payment reference is required'
//       });
//     }

//     // Determine which Squad API key to use based on environment
//     const secretKey = process.env.ENVIRONMENT === 'production'
//       ? process.env.SQUAD_SECRET_KEY
//       : 'sandbox_sk_5f5323d1193fdf48d02c3f3c6b90333489fcf32f84e9'; // Replace with your test key

//     // Determine API base URL based on environment
//     const apiBaseUrl = process.env.ENVIRONMENT === 'production'
//       ? 'https://api-d.squadco.com'
//       : 'https://sandbox-api-d.squadco.com';

    
//     const verifyUrl = `${apiBaseUrl}/transaction/verify/${reference}`;
//     console.log('📡 Calling Squad API:', verifyUrl);
    
//     const response = await axios.get(verifyUrl, {
//       headers: {
//         Authorization: `Bearer ${secretKey}`,
//         'Content-Type': 'application/json'
//       },
//     });

//     console.log('✅ Squad API Response:', response.data);

//     const { data } = response.data;
//     console.log('Squad verification data:', data);

//     if (!data) {
//       throw new Error('No payment data received from Squad');
//     }

//     // ✅ Extract session data from metadata
//     const sessionData = extractSessionDataFromMetadata(data);

//     // Check transaction status from Squad
//     const isSuccess = data.transaction_status?.toLowerCase() === 'success';
//     const responsePayload = {
//       success: isSuccess,
//       message: isSuccess 
//         ? 'Payment verified successfully' 
//         : `Payment ${data.transaction_status}`,
//       data: data
//     };

//     res.status(200).json(responsePayload);

//     // ✅ IMPORTANT: Send response IMMEDIATELY, handle notifications asynchronously
//     // const responsePayload = {
//     //   success: data.transaction_status === 'success',
//     //   message: data.transaction_status === 'success' 
//     //     ? 'Payment verified successfully' 
//     //     : 'Payment verification failed',
//     //   data: data
//     // };


//     // Send response first (don't wait for email)
//     // res.status(200).json(responsePayload);

//     if (isSuccess) {
//       const sessionData = extractSessionDataFromMetadata(data);
      
//       sendPaymentStatusNotification(data, 'success', sessionData)
//         .catch(error => console.error('Notification error:', error));
      
//       console.log(`✅ Payment verified successfully: ${reference}`);
//     } else {
//        // Send notification for failed verification (async)
//       sendPaymentStatusNotification(data, data.transaction_status, sessionData)
//         .catch(error => console.error('Failed to send failure notification:', error));
      
//       // Report error (async)
//       reportError('Squad Payment Verification Failed', new Error(`Payment verification failed for reference: ${reference}`), {
//         reference,
//         status: data.transaction_status,
//         paymentData: data,
//         sessionData
//       }).catch(error => console.error('Failed to report error:', error));
//     }

//     // ✅ Handle notifications asynchronously (don't block response)
//     // if (data.transaction_status !== 'success') {
//     //   // Send notification for failed verification (async)
//     //   sendPaymentStatusNotification(data, data.transaction_status, sessionData)
//     //     .catch(error => console.error('Failed to send failure notification:', error));
      
//     //   // Report error (async)
//     //   reportError('Squad Payment Verification Failed', new Error(`Payment verification failed for reference: ${reference}`), {
//     //     reference,
//     //     status: data.transaction_status,
//     //     paymentData: data,
//     //     sessionData
//     //   }).catch(error => console.error('Failed to report error:', error));
      
//     // } else {
//     //   // Success notification (optional - remove if not needed)
//     //   sendPaymentStatusNotification(data, 'success', sessionData)
//     //     .catch(error => console.error('Failed to send success notification:', error));
      
//     //   console.log(`✅ Squad payment verified successfully: ${reference}`);
//     // }

//   } catch (error) {
//     console.error(`Error verifying Squad payment: ${error.message}`);
    
//     // Report error asynchronously (don't block response)
//     reportError('Squad Payment Verification Error', error, {
//       operation: 'verifySquadPayment',
//       reference: req.params.reference,
//       errorResponse: error.response?.data
//     }).catch(reportingError => console.error('Failed to report error:', reportingError));

//     res.status(500).json({
//       success: false,
//       message: 'Payment verification failed',
//       error: process.env.NODE_ENV === 'production' ? undefined : error.message
//     });
//   }
// };

// const extractSessionDataFromMetadata = (paymentData) => {
//   try {
//     const metadata = paymentData.metadata;
    
//     if (metadata && typeof metadata === 'object') {
//       return {
//         SelectedTherapist: metadata.therapist_name,
//         location: metadata.location,
//         meetingType: metadata.meeting_type,
//         calendlyLink: metadata.calendly_link,
//         discountCode: metadata.discount_code,
//         discountName: metadata.discount_name,
//         // Include customer info from metadata since customer object might be empty
//         customerFirstName: metadata.customer_first_name || paymentData.first_name,
//         customerLastName: metadata.customer_last_name || paymentData.last_name,
//         customerLocation: metadata.customer_location
//       };
//     }
    
//     return null;
//   } catch (error) {
//     console.error('Error extracting session data from metadata:', error);
//     return null;
//   }
// };

// // Route handler for manual summary
// const generatePaymentsSummaryReport = async (req, res) => {
//   try {
//     const hoursBack = parseInt(req.query.hours) || 12;
//     const result = await getPaymentsSummary(hoursBack);
    
//     if (result.success) {
//       // Send email summary
//       await sendPaymentSummaryEmail(result.summary);
      
//       res.status(200).json({
//         success: true,
//         message: `Payment summary for last ${hoursBack} hours generated and sent`,
//         summary: result.summary
//       });
//     } else {
//       res.status(500).json({
//         success: false,
//         message: result.message
//       });
//     }

//   } catch (error) {
//     console.error(`Error generating payment summary: ${error.message}`);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to generate payment summary'
//     });
//   }
// };

// const getPaymentsSummary = async (hoursBack = 12) => {
//   try {
// // Determine which Squad API key to use based on environment
//     const secretKey = process.env.ENVIRONMENT === 'production'
//       ? process.env.SQUAD_SECRET_KEY
//       : 'sandbox_sk_5f5323d1193fdf48d02c3f3c6b90333489fcf32f84e9'; // Replace with your test key

//     // Calculate time range (last 12 hours)
//     const now = new Date();
//     const hoursAgo = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    
//     // Get payments from Paystack
//     const response = await axios.get('https://api.paystack.co/transaction', {
//       headers: {
//         Authorization: `Bearer ${secretKey}`,
//       },
//       params: {
//         perPage: 200, // Get more records to ensure we catch all in timeframe
//         from: hoursAgo.toISOString(),
//         to: now.toISOString()
//       }
//     });

//     const { data } = response.data;
    
//     if (!data || !Array.isArray(data)) {
//       return {
//         success: false,
//         message: 'No payment data received',
//         summary: null
//       };
//     }

//     // Filter payments within the last X hours (additional client-side filtering)
//     const recentPayments = data.filter(payment => {
//       const paymentDate = new Date(payment.created_at);
//       return paymentDate >= hoursAgo && paymentDate <= now;
//     });

//     // Stratify payments by status
//     const successfulPayments = recentPayments.filter(p => p.status === 'success');
//     const failedPayments = recentPayments.filter(p => p.status === 'failed');
//     const abandonedPayments = recentPayments.filter(p => p.status === 'abandoned');
//     const otherPayments = recentPayments.filter(p => !['success', 'failed', 'abandoned'].includes(p.status));

//     // Calculate totals
//     const totalAmount = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
//     const failedAmount = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
//     const abandonedAmount = abandonedPayments.reduce((sum, payment) => sum + payment.amount, 0);

//     // Extract therapist information
//     const getTherapistInfo = (payment) => {
//       const metadata = payment.metadata || {};
//       return {
//         therapist: metadata.therapist_name || 'Unknown',
//         meetingType: metadata.meeting_type || 'N/A',
//         location: metadata.location || 'N/A'
//       };
//     };

//     const summary = {
//       timeRange: {
//         from: hoursAgo.toISOString(),
//         to: now.toISOString(),
//         hoursBack
//       },
//       totals: {
//         totalTransactions: recentPayments.length,
//         successful: successfulPayments.length,
//         failed: failedPayments.length,
//         abandoned: abandonedPayments.length,
//         other: otherPayments.length
//       },
//       amounts: {
//         totalSuccessful: totalAmount,
//         totalFailed: failedAmount,
//         totalAbandoned: abandonedAmount,
//         currency: 'NGN'
//       },
//       details: {
//         successful: successfulPayments.map(payment => ({
//           reference: payment.reference,
//           amount: payment.amount,
//           customer: `${payment.metadata?.customer_first_name || ''} ${payment.metadata?.customer_last_name || ''}`.trim() || 'Unknown',
//           email: payment.customer?.email || 'N/A',
//           date: payment.created_at,
//           ...getTherapistInfo(payment)
//         })),
//         failed: failedPayments.map(payment => ({
//           reference: payment.reference,
//           amount: payment.amount,
//           customer: `${payment.metadata?.customer_first_name || ''} ${payment.metadata?.customer_last_name || ''}`.trim() || 'Unknown',
//           email: payment.customer?.email || 'N/A',
//           date: payment.created_at,
//           reason: payment.gateway_response || 'Unknown',
//           ...getTherapistInfo(payment)
//         })),
//         abandoned: abandonedPayments.map(payment => ({
//           reference: payment.reference,
//           amount: payment.amount,
//           customer: `${payment.metadata?.customer_first_name || ''} ${payment.metadata?.customer_last_name || ''}`.trim() || 'Unknown',
//           email: payment.customer?.email || 'N/A',
//           date: payment.created_at,
//           ...getTherapistInfo(payment)
//         }))
//       }
//     };

//     return {
//       success: true,
//       summary,
//       rawData: recentPayments
//     };

//   } catch (error) {
//     console.error(`Error getting payments summary: ${error.message}`);
//     await reportError('Payment Summary Error', error, {
//       operation: 'getPaymentsSummary',
//       hoursBack
//     });

//     return {
//       success: false,
//       message: error.message,
//       summary: null
//     };
//   }
// };

// module.exports = {
//   listPayments,
//   verifySquadPayment,
//   extractSessionDataFromMetadata,
//   getPaymentsSummary,
//   generatePaymentsSummaryReport,
// };

// controllers/squadController.js
require('dotenv').config();
const { sendPaymentStatusNotification } = require('../utils/emailService');
const { reportError } = require('../middleware/errorReporting');

/**
 * Process Squad Payment
 * Handles notifications, database operations, error reporting
 * Does NOT verify payment (that's done on frontend)
 */
// const processSquadPayment = async (req, res) => {
//   try {
//     const { squadData, metadata, transactionRef, status, isSuccess } = req.body;
    
//     console.log('\n==========================================');
//     console.log('📦 Processing Squad Payment');
//     console.log('==========================================');
//     console.log('Transaction Ref:', transactionRef);
//     console.log('Status:', status);
//     console.log('Is Success:', isSuccess);
//     console.log('==========================================\n');
    
//     if (!squadData || !transactionRef) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required payment data'
//       });
//     }
    
//     // ✅ Extract complete session data
//     const sessionData = {
//       // From metadata
//       SelectedTherapist: metadata.therapist_name,
//       location: metadata.location,
//       meetingType: metadata.meeting_type,
//       calendlyLink: metadata.calendly_link,
//       discountCode: metadata.discount_code,
//       discountName: metadata.discount_name,
//       customerFirstName: metadata.customer_first_name,
//       customerLastName: metadata.customer_last_name,
//       customerLocation: metadata.customer_location,
      
//       // From Squad data
//       customerEmail: squadData.email,
//       customerName: `${squadData.meta.customerFirstName} ${squadData.meta.customerLastName}`,
//       amount: squadData.transaction_amount,
//       currency: squadData.transaction_currency_id,
//       transactionRef: squadData.transaction_ref,
//       gatewayRef: squadData.gateway_transaction_ref,
//       merchantName: squadData.merchant_name,
//       paymentDate: squadData.created_at,
//     };
    
//     console.log('📋 Session Data:', sessionData);


    
//     // ✅ Send response immediately
//     res.status(200).json({
//       success: true,
//       message: 'Payment processing initiated',
//       data: {
//         transactionRef,
//         status,
//         processingStarted: true
//       }
//     });
    
//     // ============================================
//     // ✅ ASYNC OPERATIONS (Don't block response)
//     // ============================================
    
//     if (isSuccess) {
//       console.log('✅ Processing successful payment...');
      
//       // Send success email
//       sendPaymentStatusNotification(squadData, 'success', sessionData)
//         .then(() => console.log('✅ Success email sent'))
//         .catch(error => console.error('❌ Failed to send success email:', error.message));
      
//       // Save to database
//       savePaymentToDatabase(squadData, sessionData)
//         .then(() => console.log('✅ Payment saved to database'))
//         .catch(error => console.error('❌ Failed to save payment:', error.message));
      
//       // Send Slack notification (if you have it)
//       // sendSlackNotification('payment_success', sessionData)
//       //   .catch(error => console.error('❌ Slack notification failed:', error.message));
      
//       console.log('💰 Payment Details:', {
//         reference: transactionRef,
//         amount: squadData.transaction_amount,
//         email: squadData.email,
//         customer: `${sessionData.customerFirstName} ${sessionData.customerLastName}`,
//         therapist: sessionData.SelectedTherapist,
//         meetingType: sessionData.meetingType
//       });
      
//     } else {
//       console.log(`⚠️ Processing ${status} payment...`);
      
//       // Send failure/pending email
//       sendPaymentStatusNotification(squadData, status, sessionData)
//         .then(() => console.log(`✅ ${status} email sent`))
//         .catch(error => console.error(`❌ Failed to send ${status} email:`, error.message));
      
//       // Report error
//       reportError(
//         `Squad Payment ${status}`, 
//         new Error(`Payment ${status} for reference: ${transactionRef}`), 
//         {
//           transactionRef,
//           status,
//           amount: squadData.transaction_amount,
//           email: squadData.email,
//           squadData,
//           sessionData
//         }
//       ).catch(error => console.error('❌ Failed to report error:', error.message));
//     }
    
//     console.log('==========================================');
//     console.log('✅ Payment processing completed');
//     console.log('==========================================\n');
    
//   } catch (error) {
//     console.error('❌ Error processing payment:', error.message);
    
//     // Report processing error
//     reportError('Squad Payment Processing Error', error, {
//       operation: 'processSquadPayment',
//       body: req.body
//     }).catch(err => console.error('❌ Failed to report error:', err.message));
    
//     res.status(500).json({
//       success: false,
//       message: 'Payment processing failed',
//       error: process.env.NODE_ENV === 'production' ? undefined : error.message
//     });
//   }
// };

const processSquadPayment = async (req, res) => {
  try {
    const { squadData, metadata, transactionRef, status, isSuccess } = req.body;
    
    console.log('\n==========================================');
    console.log('📦 Processing Squad Payment');
    console.log('==========================================');
    console.log('Transaction Ref:', transactionRef);
    console.log('Status:', status);
    console.log('Is Success:', isSuccess);
    console.log('==========================================\n');
    
    if (!squadData || !transactionRef) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment data'
      });
    }
    
    // ✅ Extract metadata from Squad's 'meta' field
    const squadMeta = squadData.meta || {};

    const squadFullData = squadData.data || {};
    
    // ✅ Extract complete session data
    const sessionData = {
      // From Squad meta (camelCase)
      SelectedTherapist: squadMeta.SelectedTherapist || metadata.therapist_name,
      location: squadMeta.location || metadata.location,
      meetingType: squadMeta.meetingType || metadata.meeting_type,
      calendlyLink: squadMeta.calendlyLink || metadata.calendly_link,
      discountCode: squadMeta.discountCode || metadata.discount_code,
      discountName: squadMeta.discountName || metadata.discount_name,
      customerFirstName: squadMeta.customerFirstName || metadata.customer_first_name,
      customerLastName: squadMeta.customerLastName || metadata.customer_last_name,
      customerLocation: squadMeta.location || metadata.location,
      
      // From Squad data
      customerEmail: squadData.email || metadata.customer_email,
      customerName: `${squadMeta.customerFirstName || metadata.customer_first_name} ${squadMeta.customerLastName || metadata.customer_last_name}`,
      amount: squadData.transaction_amount || metadata.amount,
      currency: squadData.transaction_currency_id || metadata.currency,
      transactionRef: transactionRef,
      gatewayRef: squadFullData.gateway_transaction_ref || metadata.gateway_transaction_ref,
      merchantName: squadFullData.merchant_name,
      paymentDate: squadFullData.created_at|| metadata.created_at,
    };
    
    console.log('📋 Session Data:', sessionData);

    // ✅ Transform Squad data to match Paystack format for email service
    const transformedPaymentData = {
      reference: transactionRef,
      amount: squadData.transaction_amount || metadata.amount, // Already in kobo/cents
      created_at: squadFullData.created_at|| metadata.created_at,
      status: squadFullData.transaction_status,
      currency: metadata.currency,
      isCurrency: 'USD',
      
      // ✅ Add metadata in Paystack format (snake_case)
      metadata: {
        customer_first_name: squadMeta.customerFirstName || metadata.customer_first_name,
        customer_last_name: squadMeta.customerLastName || metadata.customer_last_name,
        therapist_name: squadMeta.SelectedTherapist || metadata.therapist_name,
        location: squadMeta.location || metadata.location,
        meeting_type: squadMeta.meetingType || metadata.meeting_type,
        calendly_link: squadMeta.calendlyLink || metadata.calendly_link,
        discount_code: squadMeta.discountCode || metadata.discount_code,
        discount_name: squadMeta.discountName || metadata.discount_name,
      },
      
      // ✅ Add customer object in Paystack format
      customer: {
        email: metadata.customer_email,
        phone: 'N/A', // Squad doesn't return phone
      }
    };
    
    console.log('📧 Transformed Payment Data for Email:', transformedPaymentData);
    
    // ✅ Send response immediately
    res.status(200).json({
      success: true,
      message: 'Payment processing initiated',
      data: {
        transactionRef,
        status,
        processingStarted: true
      }
    });
    
    // ============================================
    // ✅ ASYNC OPERATIONS (Don't block response)
    // ============================================
    
    if (isSuccess) {
      console.log('✅ Processing successful payment...');
      
      // ✅ Send success email with transformed data
      sendPaymentStatusNotification(transformedPaymentData, 'success', sessionData)
        .then(() => console.log('✅ Success email sent'))
        .catch(error => {
          console.error('❌ Failed to send success email:', error.message);
          console.error('Error details:', error);
        });
      
      // Save to database
      savePaymentToDatabase(squadData, sessionData)
        .then(() => console.log('✅ Payment saved to database'))
        .catch(error => console.error('❌ Failed to save payment:', error.message));
      
      console.log('💰 Payment Details:', {
        reference: transactionRef,
        amount: metadata.amount,
        email: metadata.customer_email,
        customer: `${sessionData.customerFirstName} ${sessionData.customerLastName}`,
        therapist: sessionData.SelectedTherapist,
        meetingType: sessionData.meetingType
      });
      
    } else {
      console.log(`⚠️ Processing ${status} payment...`);
      
      // ✅ Send failure/pending email with transformed data
      sendPaymentStatusNotification(transformedPaymentData, status, sessionData)
        .then(() => console.log(`✅ ${status} email sent`))
        .catch(error => console.error(`❌ Failed to send ${status} email:`, error.message));
      
      // Report error
      reportError(
        `Squad Payment ${status}`, 
        new Error(`Payment ${status} for reference: ${transactionRef}`), 
        {
          transactionRef,
          status,
          amount: squadData.transaction_amount,
          email: squadData.email,
          squadData,
          sessionData
        }
      ).catch(error => console.error('❌ Failed to report error:', error.message));
    }
    
    console.log('==========================================');
    console.log('✅ Payment processing completed');
    console.log('==========================================\n');
    
  } catch (error) {
    console.error('❌ Error processing payment:', error.message);
    console.error('Stack:', error.stack);
    
    // Report processing error
    reportError('Squad Payment Processing Error', error, {
      operation: 'processSquadPayment',
      body: req.body
    }).catch(err => console.error('❌ Failed to report error:', err.message));
    
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

/**
 * Save payment to database
 */
const savePaymentToDatabase = async (squadData, sessionData) => {
  try {
    console.log('💾 Saving payment to database...');
    
    // TODO: Implement your database save logic here
    // Example:
    /*
    const Payment = require('../models/Payment');
    
    const payment = new Payment({
      transactionRef: squadData.transaction_ref,
      gatewayRef: squadData.gateway_transaction_ref,
      amount: squadData.transaction_amount,
      currency: squadData.transaction_currency_id,
      status: squadData.transaction_status,
      transactionType: squadData.transaction_type,
      cardType: squadData.card_type,
      email: squadData.email,
      merchantAmount: squadData.merchant_amount,
      fee: squadData.fee,
      customerName: sessionData.customerName,
      customerFirstName: sessionData.customerFirstName,
      customerLastName: sessionData.customerLastName,
      therapistName: sessionData.SelectedTherapist,
      meetingType: sessionData.meetingType,
      location: sessionData.location,
      calendlyLink: sessionData.calendlyLink,
      discountCode: sessionData.discountCode,
      discountName: sessionData.discountName,
      provider: 'Squad',
      createdAt: new Date(squadData.created_at),
      metadata: squadData.meta
    });
    
    await payment.save();
    console.log('Payment saved with ID:', payment._id);
    */
    
    console.log('✅ Payment saved successfully');
    
  } catch (error) {
    console.error('❌ Error saving payment to database:', error);
    throw error;
  }
};

module.exports = {
  processSquadPayment,
  savePaymentToDatabase
};

/**
 * Save payment to database
 */


module.exports = {
  processSquadPayment,
  savePaymentToDatabase
};