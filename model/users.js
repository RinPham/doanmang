var mongoose = require('mongoose');

var Schema = new mongoose.Schema({

  email: String,

  myName: String,

  password: String,

  rooms: [
    	String
  ],

  headLine: String,

  age: String,

  aboutMe: String,

  profilePhoto: String,

  height: String,

  weight: String,

});

module.exports = mongoose.model('Users', Schema);
