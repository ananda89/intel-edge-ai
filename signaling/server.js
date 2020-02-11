var keypath = '/etc/nginx/ssl/tethrlite.key'; //live
var certpath = '/etc/nginx/ssl/tethrlitelive.crt'; //live

if(__dirname==='/var/www/html/Signaling'){
    // var keypath = '/var/www/html/Signaling/ssl/key.pem'; //pp
    // var certpath = '/var/www/html/Signaling/ssl/cert.pem'; //pp

    var keypath = '/var/www/html/Signaling/ssl/phase_2_key.key'; //pp
    var certpath = '/var/www/html/Signaling/ssl/phase_2_cert.pem'; //pp
}

var keypath = '/var/www/html/tethr_lite_video_streaming_platform_004475/Signaling/ssl/key.pem'; //local
var certpath = '/var/www/html/tethr_lite_video_streaming_platform_004475/Signaling/ssl/cert.pem'; //local

var port = 8091;

// in sublime
//var port = process.env.PORT || 8082;
console.log('Running on port' + port)

const WebSocketServer = require('ws').Server,
    express = require('express'),
    https = require('https'),
    app = express(),
    fs = require('fs'),
    uuid = require('uuid');

const myUploader = require('./uploader');

var __videofolder = __dirname + '/videos';
if (!fs.existsSync(__videofolder)) {
    fs.mkdirSync(__videofolder);
}

const pkey = fs.readFileSync(keypath),
    pcert = fs.readFileSync(certpath),
    options = { key: pkey, cert: pcert, passphrase: '123456789' };

var wss = null, sslSrv = null;
var users = [], rooms = [], expiryTime = 30 * 60 * 1000, maxUsers = 2;
var videoDict = {};

// use express static to deliver resources HTML, CSS, JS, etc)
// from the public folder 
//app.use(express.static('public'));

/**
* Force load with https on production environment
* https://devcenter.heroku.com/articles/http-routing#heroku-headers
*/
module.exports = function (environments, status) {
    environments = environments || ['production'];
    status = status || 302;
    return function (req, res, next) {
        if (environments.indexOf(process.env.NODE_ENV) >= 0) {
            if (req.headers['x-forwarded-proto'] != 'https') {
                res.redirect(status, 'https://' + req.hostname + req.originalUrl);
            }
            else {
                next();
            }
        }
        else {
            next();
        }
    };
};

// app.use(function (req, res, next) {
//     if (req.headers['x-forwarded-proto'] === 'http') {
//         return res.redirect(['https://', req.get('Host'), req.url].join(''));
//     }
//     next();
// });

// https.createServer(options, function (req, res) {
//     res.writeHead(200);
//     res.end("Bypass HTTPS by accepting certificate\n");
// }).listen(port);

//app.get('/user/:id', function (req, res) {
    // res.sendFile(__dirname + '/public/guest.html');
    //res.sendFile(__dirname + '/public/guest.html', { 'roomToken': req.params.id });
    // res.send('user' + req.params.id);
//});


// start server (listen on port 443 - SSL)
sslSrv = https.createServer(options, app).listen(port);
console.log("The HTTPS server is up and running");

// create the WebSocket server
wss = new WebSocketServer({ server: sslSrv });
console.log("WebSocket Secure server is up and running.");


var checkArray = function (array) {
    Object.keys(array).map(function (item) {
        if (array[item] && array[item].joinedOn + expiryTime < +new Date()) {
            array.splice(item, 1);
            //delete array[item];
        }
    });
    return array;
};

wss.on('sendChunk', function (data) {
    console.log('Got Payload');
    var decoded = new Buffer(data.data, 'base64').toString('binary');
    console.log(decoded);
    var path = '/home/hb/andyprojects/Projects/RTC/heroku_code/chunk/'
    filename = 'test.webm'
    fs.appendFileSync(path + fileName, decoded, 'binary');
    console.log(data.sequence + ' - The data was appended to file ' + fileName);
});

/** successful connection */
wss.on('connection', function (client, message) {
    console.log("A new WebSocket client was connected. + message.");
    client.id = uuid.v4();


    var notifyUsersOfConnection = function (room, client, userId) {

        // var obj = { 'action': 'newSub', 'room': room, 'count': users[room].length, sessionId: sessionId, visitorId: visitorId };
        var obj = {
            'action': 'newJoinee',
            'room': room,
            'count': rooms[room].length,
            'userId': userId
        };
        var message = JSON.stringify(obj);
        var roomcliets = rooms[room];
        Object.keys(roomcliets).map(function (item) {
            if (client !== roomcliets[item]) {
                roomcliets[item].send(message);
            }
        });
    };

    var notifyUsersOfDisconnection = function (room, key) {

        var userId = null;
        //    console.log(users, room, key);
        if (users[room][key]) {
            userId = users[room][key];
            users[room].splice(key, 1);
            users[room] = checkArray(users[room]);
        }

        var obj = {
            'action': 'imOffline',
            'room': room,
            'userId': userId,
            'count': users[room].length
        };
        var message = JSON.stringify(obj);
        var array = rooms[room];
        Object.keys(array).map(function (item) {
            //            console.log('notifyUsersOfDisconnection', item);
            array[item].send(message);
        });
    };


    /** incomming message */
    client.on('message', function (message) {
        /** broadcast message to all clients */

        try {

            // console.log(typeof message == 'object');
            if (typeof message == 'object') {
                processBlob(videoDict[client.id], message);
                return
            }

            data = JSON.parse(message);
            var action = data.action;
            var room = (data.room) ? data.room : "";
            // console.log(action + " " + room);
            if (action === 'join' && room) {

                if ((rooms[room] != undefined && room[room] !== client) //other user wants to join in existing room
                    || (room[room] == undefined)) { //or user wants to create room

                    if (rooms[room] != undefined //room exists and room is fullhouse
                        && rooms[room].length >= maxUsers) {
                        sendRejectMessage(client, "room is full, try creating another room");
                    } else {

                        if (!rooms[room]) { //there is no room with given room id
                            rooms[room] = new Array();
                        }

                        if (rooms[room].indexOf(client) === -1) //check that client is not exist
                            rooms[room].push(client); // add client in room

                        console.log("room length " + rooms[room].length);

                        if (data.userId) {
                            var userInfo = {
                                'userId': data.userId,
                                'joinedOn': new Date(),
                                'rejoinedOn': new Date()
                            }

                            if (!users[room]) { //if first time user so initializing the blank array of user of room
                                users[room] = new Array();
                            }

                            users[room].push(userInfo);
                            users[room] = checkArray(users[room])

                            //notfiy other users in room about event
                            notifyUsersOfConnection(room, client, userInfo.userId)
                        } else {
                            sendRejectMessage(client, "userId required");
                        }
                    }

                } else {
                    sendRejectMessage(client, "room already exist and joined");
                }

            } else if (action === 'upload' && room) {
                var folderId = data.metadata.callLogId + '-' + data.metadata.callLogMediaId;

                var dir = __videofolder + '/' + folderId;
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
                fs.writeFileSync(dir + "/metadata.json", JSON.stringify(data.metadata));


                if (data.metadata.isRecordingStopped == 0) {
                    console.log('Apun idhar aa gaya');
                    videoDict[client.id] = data.metadata;
                    var obj = {
                        'action': 'upload',
                        'status': 200
                    };
                    var message = JSON.stringify(obj);
                    client.send(message);
                } else {
                    console.log('upload to python');
                    // callID = videoDict[room]; metadata
                    myUploader.uploadVideo(folderId + '.' + data.metadata.type, dir + '/' + folderId + '.' + data.metadata.type
                        , dir + '/metadata.json',
                        data.metadata.callLogId, data.metadata.callLogMediaId);
                }

            } else if (action === 'network_check' && room) {
                var obj = {
                    'action': 'network_check',
                    'status': 200
                };
                var message = JSON.stringify(obj);
                client.send(message);
            } else if (room && rooms[room]) {

                //send to everybody subscribed to the room received except the sender
                var array = rooms[room];
                Object.keys(array).map(function (item) {
                    if (client !== array[item]) {
                        array[item].send(message);
                    }
                });

            } else {
                var obj = {
                    'action': 'OUT_OF_SCOPE',
                    'message': "If you are trying to send message "
                        + " to others then roomId required or give specific action"
                };
                var message = JSON.stringify(obj);
                client.send(message);
            }

        } catch (error) {

            // console.log('error' + message);

        }

        // wss.broadcast(message, client);
    });

    function processBlob(metadata, data) {
        writeToDisk(metadata, data);
    }

    function writeToDisk(metadata, dataURL) {


        var filename = __videofolder + '/'
            + metadata.callLogId + '-' + metadata.callLogMediaId + '/'
            + metadata.callLogId + '-' + metadata.callLogMediaId
            + '.' + metadata.type


        try {
            fs.appendFileSync(filename, dataURL);
            console.log(filename);
        } catch (error) {
            console.log(error);
        }
    }

    client.on('close', function () {

        Object.keys(rooms).map(function (room) {
            Object.keys(rooms[room]).map(function (conns) {
                if (rooms[room][conns] === client) {

                    rooms[room].splice(conns, 1);
                    users[room] = checkArray(users[room]); //remove user if its expired
                    console.log("room length " + rooms[room].length);
                    console.log("users in room length " + users[room].length);

                    notifyUsersOfDisconnection(room, conns);

                    console.log("users in room length " + users[room].length);
                }
            });
        });
    });
});

// broadcasting the message to WebSocket clients.
wss.broadcast = function (data, exclude) {

    var i = 0, n = this.clients ? this.clients.length : 0, client = null;
    if (n < 1)
        return;
    //    console.log("Broadcasting message to all " + n + " WebSocket clients.");
    for (; i < n; i++) {
        client = this.clients[i];
        // don't send the message to the sender...
        if (client === exclude)
            continue;
        if (client.readyState === client.OPEN) {
            client.send(data);
        } else {
            console.error('Error: the client state is ' + client.readyState);
        }

    }

};


function sendRejectMessage(client, msg) {
    var obj = {
        'action': 'joinRejected',
        'message': msg
    };
    var message = JSON.stringify(obj);
    client.send(message);
}