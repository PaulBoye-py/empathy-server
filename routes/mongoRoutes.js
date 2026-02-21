const express = require('express');
const router = express.Router();
const mongoController = require('../controllers/mongoController');

router.post('/booking', async (req, res) => {
  const allowedOrigins = [
    'https://www.myempathyspace.com',
    'https://myempathyspace.com',
    'https://test.myempathyspace.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://empathy-space-site-paulboye-py.vercel.app',
    'https://therapist-backend-update.vercel.app',
    'https://therapist-backend-update-paulboyepys-projects.vercel.app',
    'https://admin.myempathyspace.com',
    'https://main.dmotaszbywzfp.amplifyapp.com',
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    const { firstName, lastName, email, meetingType, location, therapistName, appointmentDate, receiptUrl, paymentReference } = req.body;
    const bookingDetails = {
      firstName,
      lastName,
      email,
      therapistName,
      meetingType,
      location,
      appointmentDate,
      receiptUrl,
      paymentReference,
    };
    const result = await mongoController.saveNewBooking(bookingDetails);
    res.json(result);
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/bookings', async (req, res) => {
  const allowedOrigins = [
    'https://www.myempathyspace.com',
    'https://myempathyspace.com',
    'https://test.myempathyspace.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://empathy-space-site-paulboye-py.vercel.app',
    'https://therapist-backend-update.vercel.app',
    'https://therapist-backend-update-paulboyepys-projects.vercel.app',
    'https://admin.myempathyspace.com',
    'https://main.dmotaszbywzfp.amplifyapp.com',
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    const filters = {
      email: req.query.email,
      firstName: req.query.firstName,
      lastName: req.query.lastName,
      meetingType: req.query.meetingType,
      therapistName: req.query.therapistName,
      date: req.query.date,
    };
    const bookings = await mongoController.getBookings(filters);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Ensure this is uncommented
module.exports = router;
