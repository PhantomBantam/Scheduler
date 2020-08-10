const mongoose = require('mongoose');

let ReminderSchema = mongoose.Schema({

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
    required: false
  }
});