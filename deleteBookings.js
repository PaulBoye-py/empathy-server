require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/mongoModels');

const deleteBookingsByEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Booking.deleteMany({
      email: { $regex: /^paul\.ade/i }
    });

    console.log(`Deleted ${result.deletedCount} booking(s)`);
    
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

deleteBookingsByEmail();
