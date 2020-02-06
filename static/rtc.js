'use strict';
//1. ffmpeg -i 20190313_161157.mp4 file.mjpeg for creating fake webcam
//2.

//For Ice servers
// turnserver -a -o -v -n -u user:root -p 3478 -L 172.31.37.43 -r someRealm -X 18.212.121.171/172.31.37.43 --no-dtls --no-tls

let video1, remoteVideo, makeCallButton, muteVideoButton, roomToken, reqLocButton, muteButton, recordButton, canvas, ctx;
let pcLocal;
let recordedBlobs, mediaRecorder, remoteStream, videoOnlyStream, fullStream;
let mediaStreams = [];
var deviceIdList = [];
let remoteAvailable = false, shouldClearCanvas = false, firedOnce = false;
const guestUserId = 7600006753;

var hbrecorder;

var config = {
    wssHost: 'wss://localhost:8081/'
    // 18.138.121.247:3478
};


// var wsc = new WebSocket(config.wssHost),
//     peerConnCfg = {
//         "rtcpMuxPolicy": "require", "bundlePolicy": "max-bundle",
//         iceServers: [{ urls: ["stun:bturn2.xirsys.com"] }, { username: "N560BYAsI-PLjl6Fxxt9gk7PQl_wnzre9D2u5DmRH9gOVia1_ysi0qJevPfMR2iBAAAAAF2v6uttYXl1cmthbm9qaXlh", credential: "7adcc544-f559-11e9-a660-9646de0e6ccd", urls: ["turn:bturn2.xirsys.com:80?transport=udp", "turn:bturn2.xirsys.com:3478?transport=udp", "turn:bturn2.xirsys.com:80?transport=tcp", "turn:bturn2.xirsys.com:3478?transport=tcp", "turns:bturn2.xirsys.com:443?transport=tcp", "turns:bturn2.xirsys.com:5349?transport=tcp"] }]
//     };

var wsc = new WebSocket(config.wssHost),
    peerConnCfg = {
        "rtcpMuxPolicy": "require", "bundlePolicy": "max-bundle",
        iceServers: [{ urls: ["stun:18.138.121.247:3478"] }, { username: "hb", credential: "hbdev", urls: ["turn:18.138.121.247:3478?transport=udp", "turn:18.138.121.247:3478?transport=tcp", "turns:18.138.121.247:5000?transport=tcp"] }]
    };



wsc.addEventListener('open', evt => { keepAlive(); });
//Keeps socket open
function keepAlive() {
    const heartbeat = setInterval(function () { wsc.send('ping'); }, 2000);
};


const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};


function drawStuff() {
    if (!video1.paused && !video1.ended) {

        if (canvas == null)
            return;

        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fill();

        if (!remoteAvailable) {
            var scale = Math.min(
                canvas.width / video1.videoWidth,
                canvas.height / video1.videoHeight);
            var vidH = video1.videoHeight;
            var vidW = video1.videoWidth;
            var top = canvas.height / 2 - (vidH / 2) * scale;
            var left = canvas.width / 2 - (vidW / 2) * scale;
            // ctx.drawImage($this, 0, 0);
            ctx.drawImage(video1, left, top, vidW * scale, vidH * scale);

        } else {
            ctx.save();

            var scale = Math.min(
                canvas.width / remoteVideo.videoWidth,
                canvas.height / remoteVideo.videoHeight);
            var vidH = remoteVideo.videoHeight;
            var vidW = remoteVideo.videoWidth;
            var top = canvas.height / 2 - (vidH / 2) * scale;
            var left = canvas.width / 2 - (vidW / 2) * scale;
            ctx.drawImage(remoteVideo, left, top, vidW * scale, vidH * scale);

            var SCALE_SIZE = 5;

            var scale = Math.min(
                canvas.width / (video1.videoWidth * SCALE_SIZE),
                canvas.height / (video1.videoHeight * SCALE_SIZE));
            var vidH = video1.videoHeight;
            var vidW = video1.videoWidth;

            var height_gap = canvas.height - (vidH * scale);
            var width_gap = canvas.width - (vidW * scale);
            var WIDTH_MARGIN = (vidW * scale) / 6;
            var HEIGHT_MARGIN = (vidH * scale) / 6;


            ctx.save();
            roundedImage(width_gap - WIDTH_MARGIN, height_gap - HEIGHT_MARGIN, vidW * scale, vidH * scale, (vidH * scale) / 6);
            ctx.shadowColor = "black";
            ctx.shadowBlur = 1;
            // ctx.shadowOffsetX = 1;
            // ctx.shadowOffsetY = -1;
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
            // ctx.drawImage(video1, width_gap - WIDTH_MARGIN, height_gap - HEIGHT_MARGIN, vidW * scale, vidH * scale);
            ctx.clip();
            ctx.drawImage(video1, width_gap - WIDTH_MARGIN, height_gap - HEIGHT_MARGIN, vidW * scale, vidH * scale);
            // draw the image
            ctx.restore(); // so clipping path won't affect anything else drawn afterwards

            if (shouldClearCanvas) {
                shouldClearCanvas = false;
                setTimeout(function () {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }, 50);
            }

        }
    }

}
function roundedImage(x, y, width, height, radius) {
    ctx.beginPath();

    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function gotStream(stream) {


    console.log('Received local stream');
    video1.srcObject = stream;
    setTimeout(function () {
        video1.play();
    }, 50);
    window.localStream = stream;
    mediaStreams.push(stream);

    video1.addEventListener('play', function () {
        var $this = this; //cache
        (function loop() {
            drawStuff();

            setTimeout(loop, 1000 / 30); // drawing at 30fps
        })();
    }, 0);

    pcLocal = new RTCPeerConnection(peerConnCfg);
    pcLocal.onicegatheringstatechange = gatheringStateChange;

    // send any ice candidates to the other peer
    pcLocal.onicecandidate = onIceCandidateHandler;
    console.log('pc1: created local and remote peer connection objects');

    stream.getTracks().forEach(track => pcLocal.addTrack(track, stream));
    console.log('Adding local stream to pcLocal');
    pcLocal.ontrack = gotRemoteStream1;

    var repeatInterval = 2000; // 2000 ms == 2 seconds
}

function stopCam() {
    window.localStream.getTracks().forEach(track => track.stop());
    video1.src = null;
    window.localStream.onended = null;
    window.localStream = null;
}

window.onbeforeunload = closingCode;
function closingCode() {
    pcLocal.close();
    pcLocal = null;
    wsc.send('CLOSED WEB PAGE');
    console.log('CLOSED WEB PAGE');
    // do something...
    return null;
}

function gatheringStateChange() {
    if (pcLocal.iceGatheringState !== 'complete') {
        console.log(pcLocal.iceGatheringState)
        return;
    } else {
        console.log(pcLocal.iceGatheringState)
        // ;
    }
    // pcLocal.close();
    // pcLocal = null;
}

function gotRemoteStream1(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
        console.log('pc1: received remote stream');
        remoteStream = e.streams[0];

        mediaStreams.push(e.streams[0]);
        remoteAvailable = true;

        if (ctx == null)
            return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function start() {

    console.log('Requesting local stream');


    // startButton.disabled = true;
    navigator.mediaDevices
        .getUserMedia({
            audio: {
                mandatory: {
                    echoCancellation: true,
                    googAutoGainControl: true,
                    googHighpassFilter: true,
                    googNoiseSuppression: true
                }
            },
            video: true
        })
        .then(gotStream)
        .catch(e => console.log('getUserMedia() error: ', e));

}


function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function initializationGuestMessage() {
    if (wsc.readyState === wsc.OPEN) {
        keepAlive();

        const payload = {
            "action": "join",
            "room": roomToken,
            "userId": guestUserId // exper agent number
        }
        wsc.send(JSON.stringify(payload));
        var messageBox = document.getElementById("messages");
        // document.getElementById("myspan").textContent="newtext";
        messageBox.textContent = 'Please wait for while... we are connecting to you to the agent';
    } else {
        console.log('Socket not opened');
    }
};


function initializationMessage(req, resp) {

    // mobileNumber = txtMobileNumber.value
    if (wsc.readyState === wsc.OPEN) {
        // roomToken = makeid(7); //make calling number incrypted and pass to other user
        roomToken = document.getElementById('mobileNumber').value; //make calling number incrypted and pass to other user
        const payload = {
            "action": "join",
            "room": roomToken,
            "userId": 9999999999 // exper agent number
        }
        wsc.send(JSON.stringify(payload));
        var messageBox = document.getElementById("messages");
        // document.getElementById("myspan").textContent="newtext";
        messageBox.textContent = 'Please wait while other user clicks this link ' + req.target.baseURI + 'user/' + roomToken;
        window.roomURL = req.target.baseURI + 'user/' + roomToken;
        console.log(window.roomURL);

        var a = document.createElement('a');
        a.setAttribute("id", "roomLink");
        var linkText = document.createTextNode(window.roomURL);
        a.appendChild(linkText);
        a.title = window.roomURL;
        a.href = window.roomURL;
        document.body.appendChild(a);

    } else {
        console.log("Socket not opened yet")
    }
};


function guestReady(request, response) {

    window.onorientationchange = () => {
        // console.log(window.orientation);
        console.log('ORIENTATION CHANGED');
        const payload = {
            "action": "response",
            "operation": "orientation_changed",
            "room": roomToken,
            "userId": guestUserId,
            "payload": {
                "angle": window.orientation
            }
        }

        wsc.send(JSON.stringify(payload));
    };


    roomToken = request.target.location.pathname;
    roomToken = roomToken.slice(6);
    console.log(roomToken);

    video1 = document.createElement("video", { autoPlay: true }); // create a video element
    video1.id = "temp_video";
    video1.setAttribute("playsinline", null);
    video1.setAttribute("autoPlay", true);
    video1.controls = true;
    video1.muted = true;
    // video1.autoplay = true;

    document.body.appendChild(video1);


    // remoteVideo = document.querySelector('video#remoteVideo');
    remoteVideo = document.createElement("video", { autoPlay: true }); // create a video element
    remoteVideo.setAttribute("playsinline", null);
    remoteVideo.setAttribute("autoPlay", true);

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        console.log('Assigned New Heights');
        /**
         * Your drawings need to be inside this function otherwise they will be reset when 
         * you resize the browser window and the canvas goes will be cleared.
         */
        drawStuff();
    }

    start();

    // setInterval(initializationMessage, 1500);
    setTimeout(initializationGuestMessage, 5000)

};


function pageReady(request, response) {

    video1 = document.createElement("video", { autoPlay: true }); // create a video element

    video1.setAttribute("playsinline", null);
    video1.setAttribute("autoPlay", true);
    video1.controls = true;
    video1.muted = true;
    // video1.autoplay = true;

    // remoteVideo = document.querySelector('video#remoteVideo');
    remoteVideo = document.createElement("video", { autoPlay: true }); // create a video element
    remoteVideo.setAttribute("playsinline", null);
    remoteVideo.setAttribute("autoPlay", true);

    makeCallButton = document.getElementById("makeACall");
    recordButton = document.getElementById("record");
    muteButton = document.getElementById("btnMute");
    reqLocButton = document.getElementById("reqLocation");

    makeCallButton.onclick = initializationMessage;
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');


    // resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        console.log('Assigned New Heights');
        /**
         * Your drawings need to be inside this function otherwise they will be reset when 
         * you resize the browser window and the canvas goes will be cleared.
         */
        drawStuff();
    }
    // resizeCanvas();

    start();

    // var stopCamButton = document.getElementById("stopCam");
    // stopCamButton.addEventListener('click', () => {
    //     stopCam();
    // });

}


wsc.onmessage = function (evt) {
    var signal = null;
    //if (!peerConn) answerCall();
    var data1 = evt.data;

    console.log("data type    ===>" + Object.prototype.toString.call(data1))
    if (Object.prototype.toString.call(data1) === "[object Blob]") {
        let bufferOriginal = Buffer.from(data1)
        bufferOriginal.toString('utf8')
        signal = JSON.parse(JSON.stringify(bufferOriginal));

    } else {
        signal = JSON.parse(evt.data)
    }
    receiveMessage(signal)
};


function receiveMessage(message) {

    if (message != null) {
        console.log(message);
        if (message.action != null) {
            if (message.action === 'newJoinee') {
                createAndSendOffer();
            } else if (message.action == 'message') {

                if (message.sdp) {

                    var dic = message.sdp;
                    if (dic.type) {
                        if (dic.type == 'offer') {
                            if (dic.sdp) {
                                pcLocal.setRemoteDescription(new RTCSessionDescription({ "type": "offer", "sdp": dic.sdp }));
                                createAndSendAnswer();
                            }
                        } else {
                            if (dic.sdp) {
                                pcLocal.setRemoteDescription(new RTCSessionDescription({ "type": "answer", "sdp": dic.sdp }));
                            }
                        }

                    }

                } else if (message.candidate) {
                    var dic = message.candidate;
                    var mid = dic.sdpMid;
                    var sdpLineIndex = dic.sdpMLineIndex;
                    var sdp = dic.candidate;

                    var cnd = new RTCIceCandidate({ "candidate": sdp, "sdpMLineIndex": "sdpLineIndex", "sdpMid": mid })
                    pcLocal.addIceCandidate(cnd);

                    //                }
                } else if (message.frame) {
                    var dic = message.frame;
                    console.log("width is====>" + dic.width)
                    console.log("height is====>" + dic.height)
                    let constraints = {
                        width: dic.width,
                        height: dic.height,
                        aspectRatio: 0.5839
                    };
                    let videoTracks = localVideoStream.getVideoTracks();


                    if (videoTracks.length) {
                        let videoTrack = videoTracks[0];
                        videoTrack.applyConstraints(constraints)
                    }
                }

            }
        }
    }

}

function onIceCandidateHandler(evt) {
    if (!evt || !evt.candidate) return;
    var cnd = evt.candidate
    wsc.send(JSON.stringify({ "candidate": { "sdpMLineIndex": cnd.sdpMLineIndex, "sdpMid": cnd.sdpMid, "candidate": cnd.candidate }, "room": roomToken, "action": "message" }));
};

function createAndSendOffer() {
    pcLocal
        .createOffer(offerOptions)
        .then(gotDescription1Local, onCreateSessionDescriptionError);

};

function gotDescription1Local(desc) {
    pcLocal.setLocalDescription(desc);
    // console.log(`Offer from pcLocal\n${desc.sdp}`); todo
    console.log("Local offer set and uncomment log to see it in full")
    //we will send session description via signaling
    wsc.send(JSON.stringify({ "sdp": { "sdp": desc.sdp, "type": desc.type }, "room": roomToken, "action": "message" }));

}

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}


function createAndSendAnswer() {
    pcLocal.createAnswer().then(gotDescription1Remote, onCreateSessionDescriptionError);
};

function gotDescription1Remote(desc) {
    // console.log(`Answer from pcRemote\n${desc.sdp}`);
    console.log("Got Answer froom pcRemote uncomment log to see it in full")
    pcLocal.setLocalDescription(desc);
    wsc.send(JSON.stringify({ "sdp": { "sdp": desc.sdp, "type": "answer" }, "room": roomToken, "action": "message" }));
}

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}
