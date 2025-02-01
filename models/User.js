const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true},
  lastName: { type: String, required: true},  
  phoneNumber: { type: String, required: true},
  position: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true},
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superuser', 'user'], default: 'user', required: true },
  title: { type: String }
});

userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        // the password should not be revealed
        delete returnedObject.passwordHash
    }
})

// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// const User = mongoose.model('User', userSchema);
// module.exports = User;

// module.exports = mongoose.model('User', userSchema)


module.exports = (connection) => connection.model('User', userSchema)
