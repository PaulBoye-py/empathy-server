const mongoose = require('mongoose');
const db = require('../utils/mongoConnect');

// Define the schema for bookings
const bookingSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  meetingType: String,
  location: String,
  appointmentDate: { type: Date, default: Date.now },
  therapistName: String,
});

// Create a Mongoose model
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;