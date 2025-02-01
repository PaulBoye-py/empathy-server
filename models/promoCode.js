const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: String,
  discount: Number,
  isActive: Boolean,
  type: String,
  description: String,
  startDate: Date,
  endDate: Date
}) 

promoCodeSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = (connection) => connection.model('promoCode', promoCodeSchema)
