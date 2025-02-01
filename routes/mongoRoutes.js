// const express = require('express');
// const router = express.Router();
// const mongoController = require('../controllers/mongoController');

// // Route to handle CORS preflight requests for the booking route
// router.options('/booking', (req, res) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
//   res.sendStatus(200);
// });

// // Route in mongoRoutes.js
// router.post('/booking', async (req, res) => {
//   const { firstName, lastName, email,  meetingType, location, therapistName, appointmentDate } = req.body;
//   const bookingDetails = {
//     firstName,
//     lastName,
//     email,
//     therapistName,
//     meetingType,
//     location,
//     appointmentDate
//   };
//   const result = await mongoController.saveNewBooking(bookingDetails);
//   res.send(result);
// });



const express = require('express');
const router = express.Router();
const mongoController = require('../controllers/mongoController');


// module.exports = router;

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
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true'); // Allow credentials

  const { firstName, lastName, email, meetingType, location, therapistName, appointmentDate } = req.body;
  const bookingDetails = {
    firstName,
    lastName,
    email,
    therapistName,
    meetingType,
    location,
    appointmentDate,
  };
  const result = await mongoController.saveNewBooking(bookingDetails);
  res.send(result);
});