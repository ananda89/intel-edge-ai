'use strict';
//1. ffmpeg -i 20190313_161157.mp4 file.mjpeg for creating fake webcam
//2.

//For Ice servers
// turnserver -a -o -v -n -u user:root -p 3478 -L 172.31.37.43 -r someRealm -X 18.212.121.171/172.31.37.43 --no-dtls --no-tls

let video1, remoteVideo, makeCallButton, muteVideoButton, roomToken, reqLocButton, muteButton, recordButton, canvas, ctx, stopCallButton;
let pcLocal;
let recordedBlobs, mediaRecorder, remoteStream, videoOnlyStream, fullStream;
let mediaStreams = [];
var deviceIdList = [];
let remoteAvailable = false, shouldClearCanvas = false, firedOnce = false;
const guestUserId = 7600006753;
const API_SERVER = window.location.origin
var isAutoRecordingStarted = false, shouldUpload = true;
var hbrecorder;
var recordCanvas, rctx;
var config = {
    wssHost: 'wss://localhost:8091/',
    wssUploadHost: 'wss://localhost:8092'
};

var wsc = new WebSocket(config.wssHost),
    peerConnCfg = {
        "rtcpMuxPolicy": "require", "bundlePolicy": "max-bundle",
        iceServers: [{ urls: ["stun:bturn2.xirsys.com"] }, { username: "Fp_0GQLr0lO0i_ohbaOfjwRTiQX8wFcx4_NB-76Z6mnS6TnZUSVz3Wy83rOTr_68AAAAAF2ewvxLTUtuYXRpb24=", credential: "af49d3ba-eb1f-11e9-9d0c-9646de0e6ccd", urls: ["turn:bturn2.xirsys.com:80?transport=udp", "turn:bturn2.xirsys.com:3478?transport=udp", "turn:bturn2.xirsys.com:80?transport=tcp", "turn:bturn2.xirsys.com:3478?transport=tcp", "turns:bturn2.xirsys.com:443?transport=tcp", "turns:bturn2.xirsys.com:5349?transport=tcp"] }]
    };

var wscUpload;

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

        if (wscUpload != undefined) {
            setTimeout(function () {
                //console.log('Calling clone')
                lastClone = performance.now();
                window.requestAnimationFrame(drawClone);
            }, 1000 / 30);
        }

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
    if (recordCanvas != undefined) {
        hbrecorder.stopRecording(
            function (metadata) {
                shouldUpload = false;
                var data = {
                    "action": "upload",
                    "metadata": metadata,
                    "room": roomToken
                }
                wscUpload.send(JSON.stringify(data));
                //console.log('sent');

            }
        );
    }
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


function initAfterInvite(id) {

    // roomToken = makeid(7); //make calling number incrypted and pass to other user
    const payload = {
        "action": "join",
        "room": roomToken,
        "userId": 9999999999 // exper agent number
    }
    wsc.send(JSON.stringify(payload));
    var messageBox = document.getElementById("messages");
    // document.getElementById("myspan").textContent="newtext";
    window.roomURL = window.location.origin + '/guest/' + roomToken + '/' + id;

    messageBox.textContent = 'Please wait while other user clicks this link ' + window.roomURL;
    console.log(window.roomURL);

    var a = document.createElement('a');
    a.setAttribute("id", "roomLink");
    var linkText = document.createTextNode(window.roomURL);
    a.appendChild(linkText);
    a.title = window.roomURL;
    a.href = window.roomURL;
    document.body.appendChild(a);
}

function initializationMessage(req, resp) {

    // mobileNumber = txtMobileNumber.value
    if (wsc.readyState === wsc.OPEN) {
        //        roomToken = document.getElementById('mobileNumber').value; //make calling number incrypted and pass to other user
        roomToken = Math.random().toString(26).substr(2);

        recordInvite(function (id) {
            console.log(id);
            initAfterInvite(id);
            startRecording(id);
        });

    } else {
        console.log("Socket not opened yet")
    }
};

function callAPI(path, method, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
            console.log(this.responseText);
            callback(this.responseText);
        }
    });

    xhr.open(method, path);
    xhr.setRequestHeader("content-type", "application/json");
    xhr.setRequestHeader("cache-control", "no-cache");
    xhr.send(data);

}

function recordInvite(callback) {
    var data = JSON.stringify({
        "room_token": roomToken,
        "contact_info": document.getElementById('mobileNumber').value
    });
    console.log(data)
    callAPI(API_SERVER + "/invite", "POST", data, function (response) {
        const result = JSON.parse(response);
        callback(result.invite_id);
    });
}


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


    // roomToken = request.target.location.pathname;
    // roomToken = roomToken.slice(7);
    roomToken = document.getElementById('roomToken').textContent;
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
    wscUpload = new WebSocket(config.wssUploadHost);
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
    stopCallButton = document.getElementById("stopACall");
    
    recordButton = document.getElementById("record");
    muteButton = document.getElementById("btnMute");
    reqLocButton = document.getElementById("reqLocation");

    makeCallButton.onclick = initializationMessage;
    stopCallButton.onclick = function(){
        if (recordCanvas != undefined) {
            hbrecorder.stopRecording(
                function (metadata) {
                    shouldUpload = false;
                    var data = {
                        "action": "upload",
                        "metadata": metadata,
                        "room": roomToken
                    }
                    wscUpload.send(JSON.stringify(data));
                    //console.log('sent');
    
                }
            );
            recordCanvas = undefined;
        }
    };

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');


    recordCanvas = document.createElement('canvas');
    rctx = recordCanvas.getContext('2d');
    var canvasRatio = canvas.height / canvas.width;
    var max_width = 720;
    var max_height = parseInt(max_width * canvasRatio);
    //console.log('max_height '+ max_height);
    recordCanvas.width = max_width;
    recordCanvas.height = max_height;
    rctx.canvas.width = max_width;
    rctx.canvas.height = max_height;

    // resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        console.log('Assigned New Heights');

        var canvasRatio = canvas.height / canvas.width;
        //console.log('max_height '+ canvasRatio);

        var max_width = 720;
        var max_height = parseInt(max_width * canvasRatio);
        //console.log('max_height '+ max_height);
        recordCanvas.width = max_width;
        recordCanvas.height = max_height;
        rctx.canvas.width = max_width;
        rctx.canvas.height = max_height;
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
    console.log(message);
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


var time, lastClone;
var interval = 30;
function drawClone(time) {
    if (time - lastClone > interval) {
        drawCloneStuff();
        lastClone = time;
    }
    window.requestAnimationFrame(drawClone);
}


function uploadData(originalBlob, metadata, codecType) {

    if (shouldUpload) {
        var rightBlob = originalBlob.slice(0, originalBlob.size, codecType);
        wscUpload.send(rightBlob);
    }
}


function startRecording(id) {
    var data = JSON.stringify({
        "invite_id": id
    });
    callAPI(API_SERVER + "/record", "POST", data, function (response) {
        const result = JSON.parse(response);
        console.log(result);
        if (result.success == "1") {
            hbrecorder = new HBMediaRecorder(recordCanvas, mediaStreams, uploadData);
            hbrecorder.initialize();


            hbrecorder.startRecording(id,
                result.video_id,
                roomToken,
                function (metadata) {

                    var data = {
                        "action": "upload",
                        "metadata": metadata,
                        "room": roomToken
                    }
                    wscUpload.send(JSON.stringify(data));
                });
        }
    });
}

function drawCloneStuff() {

    var canvasRatio = canvas.height / canvas.width;

    var max_width = 720;
    var max_height = parseInt(max_width * canvasRatio);
    //console.log('max_height '+ max_height);
    recordCanvas.width = max_width;
    recordCanvas.height = max_height;
    rctx.canvas.width = max_width;
    rctx.canvas.height = max_height;

    var scale = Math.min(
        recordCanvas.width / canvas.width,
        recordCanvas.height / canvas.height);
    var vidH = canvas.height;
    var vidW = canvas.width;
    var top = recordCanvas.height / 2 - (vidH / 2) * scale;
    var left = recordCanvas.width / 2 - (vidW / 2) * scale;

    rctx.save();
    rctx.drawImage(canvas, left, top, vidW * scale, vidH * scale);
    rctx.restore();
}