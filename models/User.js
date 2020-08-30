const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 

let UserSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique:true
  }, 
  password: {
    type: String,
    required: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

UserSchema.pre('save', function(next) {
  var user = this;
  var SALT_FACTOR = 5;

  //if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});


module.exports = mongoose.model('User', UserSchema);