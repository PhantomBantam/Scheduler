const mongoose = require('mongoose');

let ReminderSchema = mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  title:{
    type: String,
    required: true
  },
  notes:{
    type: String,
    default: 'add notes here!'
  },
  remindDate:{
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isStarred: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Reminder', ReminderSchema);