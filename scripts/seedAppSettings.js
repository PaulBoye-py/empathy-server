/**
 * Run once to seed the initial AppSettings document.
 * Usage: THERAPISTS_MONGODB_URI=<uri> node scripts/seedAppSettings.js
 *
 * Starting value is false — local NGN bookings are disabled until you
 * re-enable them from the admin dashboard Settings page.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const createAppSettings = require('../models/appSettings');

const run = async () => {
  const uri = process.env.THERAPISTS_MONGODB_URI;
  if (!uri) {
    console.error('THERAPISTS_MONGODB_URI is not set');
    process.exit(1);
  }

  const conn = await mongoose.createConnection(uri).asPromise();
  const AppSettings = createAppSettings(conn);

  const result = await AppSettings.findOneAndUpdate(
    { key: 'local_bookings_enabled' },
    {
      key: 'local_bookings_enabled',
      value: false,
      description: 'Controls NGN/Paystack booking availability on the website',
      updatedBy: 'seed',
    },
    { upsert: true, new: true }
  );

  console.log('Seeded:', result.toJSON());
  await conn.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
