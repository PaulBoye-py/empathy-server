require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection URI
const mongoURI = process.env.MONGODB_URI
console.log('mongo uri', mongoURI)

// Connect to MongoDB
mongoose.connect(mongoURI)
.then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't crash the app immediately
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      mongoose.connect(mongoURI).catch(err => {
        console.error('Failed to reconnect:', err.message);
      });
    }, 5000);
  });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB!');
});

module.exports = db;
