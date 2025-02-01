const mongoose = require('mongoose');

const therapistSchema = new mongoose.Schema({
  prof_name: String,
  location: String,
  profession: String,
  gender: String,
  age_range: String,
  religion: String,
  marital_status: String,
  physical: Boolean,
  physical_naira: Number,
  physical_dollar: Number,
  physical_pounds: Number,
  virtual_naira: Number,
  virtual_dollar: Number,
  virtual_pounds: Number,
  paystack_naira_physical_payment_link: String,
  paystack_naira_virtual_payment_link: String,
  image_url: String,
  title: String,
  calendly_link: String,
  discount_physical_naira: Number,
  discount_physical_dollar: Number,
  discount_physical_pounds: Number,
  discount_virtual_naira: Number,
  discount_virtual_dollar: Number,
  discount_virtual_pounds: Number,
  description: String,  // Added new field
  isActive: Boolean, //
})

therapistSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = (connection) => connection.model('Therapist', therapistSchema)
