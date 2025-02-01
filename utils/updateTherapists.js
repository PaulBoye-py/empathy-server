require('dotenv').config()
const mongoose = require('mongoose');
const createTherapistModel = require('../models/therapist');  // Adjust the path as needed

const connectionString = process.env.THERAPISTS_MONGODB_URI

mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB - update therapist');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB: - update therapist', error.message);
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
