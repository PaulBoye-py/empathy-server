const express = require('express');
const router = express.Router();
const { sendSlackNotification } = require('../controllers/slackNotification'); // Replace with the correct path

const app = express();

// Your existing booking route
router.post('/notify', (req, res) => {
  // Handle successful booking logic
  const { firstName, lastName, email, therapistName,  meetingType, location, appointmentDate } = req.body;
  const bookingDetails = {
    firstName,
    lastName,
    email,
    location,
    meetingType,
    therapistName,
    appointmentDate
  };

  // Example Slack notification message
  const slackMessage = `New booking received from: \n
  Name: ${bookingDetails.firstName} ${bookingDetails.lastName}. \n
  Email Address: ${bookingDetails.email} \n
  Location: ${bookingDetails.location} \n
  Meeting Type: ${bookingDetails.meetingType} \n
  Therapist: ${bookingDetails.therapistName}`;

  // Replace 'general' with your Slack channel ID or name
  sendSlackNotification('C01M0S32KE2', slackMessage);

  res.status(200).json({ success: true, message: 'Booking successful' });
});

module.exports = router;

