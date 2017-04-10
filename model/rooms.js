var mongoose = require('mongoose');

var Schema = new mongoose.Schema({

	idUser: [{id: String, name: String, photo: String}],

	message: [
		{typeMessage: String, chat: String, idUser: String, senderName: String, date: String}
	]

});

module.exports = mongoose.model('Rooms', Schema);