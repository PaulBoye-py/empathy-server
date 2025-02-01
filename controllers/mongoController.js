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
    const { firstName, lastName, email,  meetingType, location,therapistName, appointmentDate } = bookingDetails;
    if (!firstName || !lastName || !email || !therapistName || !appointmentDate) {
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
}

  
  module.exports = mongoController;