var mosca = require('mosca');

var mongoose = require('mongoose');
var redis = require('redis'),
    client = redis.createClient()
var geo = require('georedis').initialize(client);

var HTTP_PORT = process.env.HTTP_PORT || 3000;
var TCP_PORT = process.env.TCP_PORT || 4000;
var MOSCA_PORT = process.env.MOSCA_PORT || 6000;

var user = require('./model/users');
var room = require('./model/rooms');

var ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: 'mongodb://admin:admin@ds157740.mlab.com:57740/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

// console.log(ascoltatore.url);

mongoose.connect(ascoltatore.url);

var settings = {
  port: MOSCA_PORT,
  persistence: mosca.persistence.Memory,
  backend: ascoltatore
};

var server = new mosca.Server(settings, function onCreated(err, broker) {
});

 
//var ids = ['581abcbd36bc9f312ab81896', '581ae38936bc9f312ab819c4', '581af45336bc9f312ab81b52', '581b07c3b478d7b639533140', '581ababd36bc9f312ab81880','581b022eb478d7b639533020']
// geo.removeLocations(ids, function(err, result) {});


var myUser = mongoose.model('Users', user.Schema);
var myRoom = mongoose.model('Rooms', room.Schema);

server.on('clientConnected', function(client) {
    console.log('client connected', client.id);
});

//fired when a message is received
server.on('published', function(packet, client) {

  if(typeof packet.payload == 'object') {
   var b = JSON.parse(packet.payload.toString());
   console.log("Client send type: ", b.type);

   if (b.type == "DangKy") {
    // var myUser = mongoose.model('Users', user.Schema);
    myUser.find({'email': b.email}, function (err, result) {
      if (err) return;
      if (result.length != 0) {
        console.log('Ton tai user');
        var msg = {
          topic: b.topic.toString(),
          payload: 'Dang Ky That bai, ton tai user',
          qos: 0,
          retain: false
        };
        server.publish(msg, function() {
          
        });
      } else {
        var newUser = new user();
        newUser.email = b.email;
        newUser.myName = b.name;
        newUser.password = b.password;
        newUser.rooms = [];
        newUser.headLine = '';
        newUser.age = '';
        newUser.aboutMe = '';
        newUser.profilePhoto = '';
        newUser.weight = '';
        newUser.height = '';

        newUser.save(function(err, result) {
          if (err) {
            console.log('Save err');
            var msg = {
              topic: b.topic.toString(),
              payload: 'Dang Ky That bai, xuat hien loi',
              qos: 0,
              retain: false
            };
            server.publish(msg, function() {

            });
          } else {
            var msg = {
              topic: b.topic.toString(),
              payload: 'Dang Ky Thanh cong',
              qos: 0,
              retain: false
            };
            // console.log(result);
            server.publish(msg, function() {

            });
          }
        });
      } 
    });
   } //Ket thuc kiem tra Dang ky
   else if (b.type == "DangNhap") {
    myUser.find({'email': b.email, 'password': b.password}, function(err, result) {
      if (err) {
          var msg = {
            topic: b.topic.toString(),
            payload: 'Xay ra loi khi tim kiem user trong mongodb',
            qos: 0,
            retain: false
          };
          server.publish(msg, function() {

          });
          return;
      }
      var userId = result._id;
      if (result.length != 0) {
        console.log('Xac Nhan User');        
        myUser = mongoose.model('Users', user.Schema);
        myUser.findOne({'_id': result[0]._id}, function(err, doc, client) {
          if (err) return;
          myRoom = mongoose.model('Rooms', room.Schema);
          var arrObjMes = [];
          var arrayRoom = [];
          for (i=0; i<doc.rooms.length; i++) {
            var temp = '{"_id": "'+doc.rooms[i]+'"}';
            arrayRoom.push(temp);
          }
          // console.log('Array Room: '+arrayRoom);
          var about = doc.aboutMe.replace(/\n/g, "\\n");
          var profileJSON = '{"_id": "'+doc._id+'", "profilePhoto": "'+doc.profilePhoto+'", "aboutMe": "'+about+'", "age": "'+doc.age+'", "headLine": "'+doc.headLine+'", "myName": "'+doc.myName+'", "email": "'+doc.email+'", "arrayRoom": ['+arrayRoom+'], "password": "'+doc.password+'", "weight": "'+doc.weight+'", "height": "'+doc.height+'"}';
          if (doc.rooms.length != 0) { 
            for (var i in doc.rooms) {
              myRoom.findOne({'_id': doc.rooms[i]}, function(err, docs) {
                if (typeof docs != 'undefined' && docs != null) {
                  var arrayMes = [];
                  var tam = 0;
                  if (docs.idUser[0].id == userId) {
                    tam = 1;
                  }
                  //Gui message cua users khi moi Dang nhap 
                  if (docs.message.length > 30) {
                    for (i=docs.message.length-30; i<docs.message.length; i++) {
                      var chatString = docs.message[i].chat.replace(/\n/g, "\\n");
                      var temp = '{"idMessage": "'+docs.message[i]._id+'", "typeMessage": "'+docs.message[i].typeMessage+'", "chat": "'+chatString+'", "senderId": "'+docs.message[i].idUser+'", "senderName": "'+docs.message[i].senderName+'", "date": "'+docs.message[i].date+'", "senderPhoto": "'+docs.idUser[tam].photo+'"}';
                      arrayMes.push(temp);
                    }
                  } else {
                    for (i=0; i<docs.message.length; i++) {
                      var chatString = docs.message[i].chat.replace(/\n/g, "\\n");
                      var temp = '{"idMessage": "'+docs.message[i]._id+'", "typeMessage": "'+docs.message[i].typeMessage+'", "chat": "'+chatString+'", "senderId": "'+docs.message[i].idUser+'", "senderName": "'+docs.message[i].senderName+'", "date": "'+docs.message[i].date+'","senderPhoto": "'+docs.idUser[tam].photo+'"}';
                      arrayMes.push(temp);
                    }
                  }
                  var idReceiver = '';
                  if (doc._id == docs.idUser[0].id) {
                    idReceiver = '{"id": "'+docs.idUser[1].id+'", "name": "'+docs.idUser[1].name+'", "photo": "'+docs.idUser[1].photo+'"}';
                  } else {
                    idReceiver = '{"id": "'+docs.idUser[0].id+'", "name": "'+docs.idUser[0].name+'", "photo": "'+docs.idUser[0].photo+'"}';
                  }

                  var temp = '{"roomId": "'+docs._id+'", "ArrayMessage": ['+arrayMes+'], "AnotherUser": '+idReceiver+'}';
                  arrObjMes.push(temp);                
                // console.log('Array Obj Mes: '+arrObjMes);  
                if (doc.rooms[doc.rooms.length-1] == docs._id) {
                  var json = '{"ans": "OK", "profile": '+profileJSON+', "arrayMessage": ['+arrObjMes+']}';
                  // console.log(json);
                  var msg = {
                    topic: b.topic.toString(),
                    payload: json,
                    qos: 0,
                    retain: false
                  }
                  server.publish(msg, function() { 

                  });  
                }
                } //End if Undefine
              });          
            } //End For
          		
      } else { //End if kiem tra room
      	var json = '{"ans": "OK", "profile": '+profileJSON+', "arrayMessage": ['+arrObjMes+']}';
      	// console.log(profileJSON);
        var msg = {
        	  topic: b.topic.toString(),
            payload: json,
            qos: 0,
			      retain: false
		    }
		    server.publish(msg, function() { });
      }
      }); //End myUser.findOne
    //End if kiem tra dang nhap thanh cong
    } else {
        console.log('Dang Nhap that bai');
        var jsonObject = '{"ans": "NOT OK", "profile": {}, "arrayMessage": []}';
        var msg = {
          topic: b.topic.toString(),
          payload: jsonObject,
          qos: 0,
          retain: false
        }
        server.publish(msg, function() {

        });

      }
    });//End myUser.find
   } //End Kiem tra Dang nhap
   else if (b.type == "KiemTraEmail") {
      // var myUser = mongoose.model('Users', user.Schema);
      myUser.find({'email': b.email}, function (err, result) {
        if (err) {
          var msg = {
            topic: b.topic.toString(),
            payload: 'Xay ra loi',
            qos: 0,
            retain: false
          };
          server.publish(msg, function() {

          });
        }
        if (result.length != 0) {
          console.log('Ton tai user');
          var msg = {
            topic: b.topic.toString(),
            payload: 'Ton tai user',
            qos: 0,
            retain: false
          };
          server.publish(msg, function() {
          
          });
        } else {
          console.log('User hop le');
          var msg = {
            topic: b.topic.toString(),
            payload: 'User hop le',
            qos: 0,
            retain: false
          }
          server.publish(msg, function() {

          });
        }
      });
   } else if (b.type == "SearchLocation") {
        // console.log(b);
        var longi = b.longitude;
        var lati = b.latitude;
        console.log('Lat: '+lati+' ..... Long: '+longi);
        geo.addLocation(b.topic.toString(), {latitude: lati, longitude: longi}, function(err, result) {
          if (err) return;
          console.log('Added Location: ', result);

        });

        geo.nearby({latitude: lati, longitude: longi}, 5000, {'withDistances': true}, function(err, result) {
          if (err) return;
          console.log('Near Locations: ', result);  

          var arrayLocationUser = [];

          for (i=0; i<result.length; i++) {
            //var distance = result[i].distance;
            myUser.find({'_id': result[i].key}, function(err, iUser) {

              if (err) {
                console.log('Errors! nearBy Can not find near locations');
                return;
              }

              if (iUser.length != 0) {
                var headline = iUser[0].headLine.replace(/\n/g, "\\n");
                var aboutMe = iUser[0].aboutMe.replace(/\n/g, "\\n");
                var newUser = '{"id": "'+iUser[0]._id+'", "name": "'+iUser[0].myName+'", "photo": "'+iUser[0].profilePhoto+'", "email": "'+iUser[0].email+'", "headLine": "'+headline+'", "age": "'+iUser[0].age+'", "aboutMe": "'+aboutMe+'", "height": "'+iUser[0].height+'", "weight": "'+iUser[0].weight+'"}';
                arrayLocationUser.push(newUser);
                
              }
            });
          } //end for
          var json1 = '{"type": "Locations", "arrayLocation": ['+arrayLocationUser+']}';
          // console.log('Rin: ' ,json1);
          for (j=0; j<result.length; j++) {  //Gui cho tat ca cac user          
            var msg = {
                topic: result[j].key,
                payload: json1,
                qos: 0,
                retain: false
            }
            server.publish(msg, function() {

            });
          }                
          
        });

      } else if (b.type == 'SelectUser') {
          //Tim chatroom cua user
            myRoom.find({$or: [{$and: [{'idUser.id':b.topic.toString()}, {'idUser.id':b.anotherId.toString()}]}, {$and: [{'idUser.id':b.anotherId.toString()}, {'idUser.id':b.topic.toString()}]}]}, function(err, reply) {
              if (err) {
                console.log('Errors SelectUser!');
                return;
              }
              if (reply.length != 0) {
                //Da co room cua 2 users
                console.log('Co phong cua '+b.name1.toString()+' va '+b.name2.toString()+' la: '+reply[0]._id);
                var chu = 0;
                var khach = 1;
                if (reply[0].idUser[0].id != b.topic.toString()) {
                  chu = 1;
                  khach = 0;
                }
                var temp = '{"id": "'+b.topic.toString()+'", "name": "'+reply[0].idUser[chu].name+'", "photo": "'+reply[0].idUser[chu].photo+'"}';
                var temp1 = '{"id": "'+b.anotherId.toString()+'", "name": "'+reply[0].idUser[khach].name+'", "photo": "'+reply[0].idUser[khach].photo+'"}';
                var temp2 = [temp, temp1];
                var json = '{"type": "SubscribeTopic", "roomId": "'+reply[0]._id+'", "users": ['+temp2+']}';
                // console.log(json);
                var msg = {
                  topic: b.topic.toString(),
                  payload: json,
                  qos: 0,
                  retain: false
                }
                var msg1 = {
                  topic: b.anotherId.toString(),
                  payload: json,
                  qos: 0,
                  retain: false
                }
                server.publish(msg, function() { });
                server.publish(msg1, function() { });

              } else {
                //Chua co room cua 2 user->tao moi room
                console.log('Chua co phong cua '+b.name1.toString()+' va '+b.name2.toString());
                var newRoom = new room();
                var temp = '{"id": "'+b.topic.toString()+'", "name": "'+b.name1.toString()+'", "photo": "'+b.photo1.toString()+'"}';
                var temp1 = '{"id": "'+b.anotherId.toString()+'", "name": "'+b.name2.toString()+'", "photo": "'+b.photo2.toString()+'"}';
                var temp2 = [temp, temp1];
                newRoom.idUser = [JSON.parse(temp), JSON.parse(temp1)];
                newRoom.message = [];
                newRoom.save(function(err, results) {
                  if (err) return;
                  var json = '{"type": "SubscribeTopic", "roomId": "'+results._id+'", "users": ['+temp2+']}';
                  // console.log(json);
                  var msg = {
                    topic: b.topic.toString(),
                    payload: json,
                    qos: 0,
                    retain: false
                  }
                  var msg1 = {
                    topic: b.anotherId.toString(),
                    payload: json,
                    qos: 0,
                    retain: false
                  }
                  server.publish(msg, function() { });
                  server.publish(msg1, function() { });

                  myUser.findOne({'_id': b.topic.toString()}, function(err, doc) {
                    doc.rooms.push(results._id);
                    doc.save();
                  });

                  myUser.findOne({'_id': b.anotherId.toString()}, function(err, doc) {
                    doc.rooms.push(results._id);
                    doc.save();
                  });
                  console.log('Da tao phong cua '+b.name1.toString()+' va '+b.name2.toString()+' la: '+results._id);
                });
                
              }
            });
      //end select user 
      }  else if (b.type == 'EditProfile') {
        myUser = mongoose.model('Users', user.Schema);
        myUser.findOne({'_id': b.idUser.toString()}, function(err, doc) {
          if (err) {
            console.log("Errors!");
            return;
          }
          doc.myName = b.name.toString();
          doc.headLine = b.headline.toString();
          doc.profilePhoto = b.photoProfile.toString();
          doc.age = b.age.toString();
          doc.aboutMe = b.aboutMe.toString();
          doc.height = b.height.toString();
          doc.weight = b.weight.toString();
          doc.save();
          for (i=0; i<doc.rooms; i++) {
            myRoom.findOne({'_id': doc.rooms[i]}, function(err, docs) {
              var j = 0;
              if (docs.rooms[0].id == b.idUser.toString()) {
                j=0;
              } else {
                j=1;
              }
              docs.rooms[j].name = b.name.toString();
              docs.rooms[j].photo = b.photoProfile.toString();
              docs.save();
            });
          }
        });
        //End if EditProfile
      }  else if (b.type == 'SearchRooms') {
        myUser = mongoose.model('Users', user.Schema);
        myUser.findOne({'_id': b.topic.toString()}, function(err, doc) {
          if (err) {
            console.log('Error Search Rooms');
            return;
          }
          var arrayRoom = [];
          if (doc != null) {
            // console.log('Room: '+doc.rooms);
            for (i=0; i<doc.rooms.length; i++) {
              var temp = '{"id": "'+doc.rooms[i]+'"}';
              arrayRoom.push(temp);
            }
          }
          var json = '{"type": "Rooms", "arrayRoom": ['+arrayRoom+']}';
          // console.log(json);
          var msg = {
            topic: b.topic.toString(),
            payload: json,
            qos: 0,
            retain: false
          }
          server.publish(msg, function() { 
            console.log('Da gui Rooms');
          });
        });
        //End Search Rooms
      } 
 }

});

server.on('ready', setup);

server.on('clientDisconnected', function(client) {
  console.log('Client Disconnected: '+client.id);
});

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running');
}


