const nodemailer = require('nodemailer');
const Booking = require('../models/mongoModels')

// Node Mailer setup
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'estherapyhub@gmail.com', 
//     pass: 'Kayfinger01', 
//   },
// });

const mongoController = {
// Insert data
saveNewBooking: async (bookingDetails) => {
  try {
    const { firstName, lastName, email, meetingType, location, therapistName, appointmentDate, receiptUrl, paymentReference, packageName } = bookingDetails;
    if (!firstName || !email || !appointmentDate) {
      return 'Missing required fields.';
    }

    const newBooking = new Booking({
      firstName,
      lastName,
      email,
      therapistName,
      meetingType,
      location,
      appointmentDate,
      receiptUrl,
      paymentReference,
      packageName,
    });

    await newBooking.save();

    // await transporter.sendMail({
    //   from: 'estherapyhub@gmail.com', // Replace with your email address
    //   to: 'estherapyhub@gmail.com',
    //   subject: 'New Booking Created',
    //   text: `Hello, a new booking has been created successfully! \n
    //         Here are the booking details: \n
    //         Name of Client: ${firstName} + ' ' + ${lastName} \n
    //         Email address of Client: ${email} \n
    //         Name of Therapsit: ${therapistName} \n
    //         Date of Appointment Booking: ${appointmentDate}`
    //         , 
    // });

    return 'New booking created for the patient.';
  } catch (error) {
    return `Error: ${error.message}`;
  }
},

getBookings: async (filters) => {
  try {
    const query = {};
    
    if (filters.email) query.email = filters.email;
    if (filters.firstName) query.firstName = new RegExp(filters.firstName, 'i');
    if (filters.lastName) query.lastName = new RegExp(filters.lastName, 'i');
    if (filters.meetingType) query.meetingType = filters.meetingType;
    if (filters.therapistName) query.therapistName = new RegExp(filters.therapistName, 'i');
    if (filters.date) {
      const startDate = new Date(filters.date);
      const endDate = new Date(filters.date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const bookings = await Booking.find(query).sort({ appointmentDate: -1 });
    return bookings;
  } catch (error) {
    throw new Error(`Error fetching bookings: ${error.message}`);
  }
},
}

  
  module.exports = mongoController;