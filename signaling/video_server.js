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

var port = 8092;

// in sublime
//var port = process.env.PORT || 8083;
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


/** successful connection */
wss.on('connection', function (client, message) {
    console.log("A new WebSocket client was connected. + message.");
    client.id = uuid.v4();

    /** incomming message */
    client.on('message', function (message) {
        /** broadcast message to all clients */

        try {

            console.log(typeof message == 'object');
            if (typeof message == 'object') {
                processBlob(videoDict[client.id], message);
                return
            }

            data = JSON.parse(message);
            var action = data.action;
            // console.log(action + " " + room);
           if (action === 'upload') {
//                var folderId = data.metadata.invite_id + '-' + data.metadata.callLogMediaId;
                var folderId = data.metadata.invite_id;

                var dir = __videofolder + '/' + folderId;
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
                fs.writeFileSync(dir + "/metadata.json", JSON.stringify(data.metadata));

                if (data.metadata.isRecordingStopped == 0) {
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
                        data.metadata.invite_id, data.metadata.video_id);
                }

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
            + metadata.invite_id + '/'
            + metadata.room
            + '.' + metadata.type

        try {
            fs.appendFileSync(filename, dataURL);
            console.log(filename);
        } catch (error) {
            console.log(error);
        }
    }

    client.on('close', function () {
        videoDict[client.id] = null;
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