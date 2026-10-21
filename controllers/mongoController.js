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
  const { firstName, lastName, email, meetingType, location, therapistName, appointmentDate, receiptUrl, paymentReference, packageName } = bookingDetails;
  if (!firstName || !email || !appointmentDate) {
    // Previously returned this as a 200 OK string, which the client treated
    // as success (showed "Ordered Confirmed" and redirected) even though
    // nothing was saved. Callers must check `success` and use `status`.
    return { success: false, status: 400, message: 'Missing required fields.' };
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

  return { success: true, status: 200, message: 'New booking created for the patient.' };
},

// The booking is created right after payment, before the receipt PDF exists,
// so the receipt link is attached afterwards. Only fills an empty receiptUrl
// (never overwrites) and only accepts an S3-hosted PDF, since this is called
// from the public checkout without auth.
attachReceipt: async ({ paymentReference, receiptUrl }) => {
  if (typeof paymentReference !== 'string' || !paymentReference ||
      typeof receiptUrl !== 'string' || !/^https:\/\/[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com\/.+\.pdf$/i.test(receiptUrl)) {
    return { success: false, status: 400, message: 'Invalid paymentReference or receiptUrl.' };
  }

  const booking = await Booking.findOneAndUpdate(
    { paymentReference, receiptUrl: { $in: [null, ''] } },
    { receiptUrl },
    { new: true }
  );

  if (!booking) {
    return { success: false, status: 404, message: 'No booking awaiting a receipt for this reference.' };
  }
  return { success: true, status: 200, message: 'Receipt attached to booking.' };
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