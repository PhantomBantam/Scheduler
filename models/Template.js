const mongoose = require('mongoose');

let TenplateSchema = mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  }, 
  title: {
    type: String,
    required: true
  },
  notes:{
    type: String,
    default: 'add notes here!'
  }
});

module.exports = mongoose.model('Template', TenplateSchema);