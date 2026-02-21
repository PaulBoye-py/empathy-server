require('dotenv').config()
const mongoose = require('mongoose');
const createTherapistModel = require('../models/therapist');  // Adjust the path as needed

const connectionString = process.env.THERAPISTS_MONGODB_URI

mongoose.connect(connectionString)
.then(() => {
    console.log('✅ Therapist MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('❌ Therapist MongoDB connection error:', error.message);
    // Don't crash the app immediately
    setTimeout(() => {
      console.log('Retrying Therapist MongoDB connection...');
      mongoose.connect(mongoUri).catch(err => {
        console.error('Failed to reconnect:', err.message);
      });
    }, 5000);
  });

const connection = mongoose.connection;
const Therapist = createTherapistModel(connection);

const updateTherapists = async () => {
  try {
    const result = await Therapist.updateMany(
      { description: { $exists: false } }, // Find documents without the description field
      { $set: { description: 'Default description' } } // Add the default description
    );
    console.log(`${result.nModified} therapists updated with a default description`);
  } catch (error) {
    console.error('Error updating therapists:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

updateTherapists();
