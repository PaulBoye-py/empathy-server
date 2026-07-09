const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: '' },
  updatedBy: { type: String, default: 'system' },
}, {
  timestamps: true,
});

appSettingsSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

// Factory pattern — must receive therapistConnection, not use mongoose.model() directly
module.exports = (connection) => connection.model('AppSettings', appSettingsSchema);
