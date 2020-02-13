function log(message) {
    // dataElement.innerHTML = dataElement.innerHTML + '<br>' + message;
    //console.log(message)
}

class HBMediaRecorder {

    constructor(canvas, streams, uploadCallBack) {
        this.canvas = canvas;
        this.streams = streams;
        this.uploadCallBack = uploadCallBack;

        if (AudioContext) {
            this.context = new AudioContext;
        } else {
            alert("Sorry, but the Web Audio API is not supported by your browser. Please, consider upgrading to the latest version or downloading Google Chrome or Mozilla Firefox");
        }

        this.UPLOAD_API = '';

        this.VIDEO_NAME = 'test';
        this.isUploading = false;
        this.invite_id;
        this.video_id;
        this.roomToken;
    }


    initialize() {

        try {
            this.recordedBlobs = [];
            if (this.streams.length == 0) {
                alert('Could not get any stream from mic/camera');
            }

            // var videoStream = stream.clone();
            var videoOutputStream = this.canvas.captureStream();

            //only one streams audio adding in recorder
            try{
                videoOutputStream.addTrack(this.streams[0].getAudioTracks()[0]);
            }catch(err){
                console.log('catch err>>>',err);
            }
            


            if (typeof MediaRecorder.isTypeSupported == 'function') {
                /*
                    MediaRecorder.isTypeSupported is a function announced in https://developers.google.com/web/updates/2016/01/mediarecorder and later introduced in the MediaRecorder API spec http://www.w3.org/TR/mediastream-recording/
                */
                if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                    var options = { mimeType: 'video/webm;codecs=vp9' };
                } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                    var options = { mimeType: 'video/webm;codecs=h264' };
                } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                    var options = { mimeType: 'video/webm;codecs=vp8' };
                }
                log('Using ' + options.mimeType);
                // mediaRecorder = new MediaRecorder(localStream, options);
                this.mediaRecorder = new MediaRecorder(videoOutputStream, options);
            } else {
                log('isTypeSupported is not supported, using default codecs for browser');
                // mediaRecorder = new MediaRecorder(localStream);
                this.mediaRecorder = new MediaRecorder(videoOutputStream);
            }

        } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);
            //   errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
            return;
        }

    }

    mix(audioContext, streams) {
        const dest = audioContext.createMediaStreamDestination();
        streams.forEach(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(dest);
        });
        return dest.stream.getTracks()[0];
    }

    //Extra Utilities
    startRecording(invite_id, video_id, roomToken, callback) {

        var extType = 'mp4';
        if (typeof MediaRecorder.isTypeSupported == 'function') {
            extType = 'webm';
        }
        var metadata = {
            "type": extType,
            "invite_id": invite_id,
            "room": roomToken,
            "isRecordingStopped": 0,
            "isCompressingStarted": 0,
            "video_id": video_id,
            "isSocketUploading": 0
        }
        //console.log(metadata);
        callback(metadata);

        this.recordedBlobs = [];
        log('Start recording...');
        this.VIDEO_NAME = new Date().toJSON();
        this.invite_id = invite_id;
        this.video_id = video_id;
        this.roomToken = roomToken;

        if (typeof MediaRecorder.isTypeSupported == 'function') {
            this.mediaRecorder.start(50); // collect 10ms of data   
        } else {
            this.mediaRecorder.start(); // collect full blob
        }


        this.mediaRecorder.onerror = function (e) {
            log('mediaRecorder.onerror: ' + e);
        };

        this.mediaRecorder.onstop = (event) => {
            log('Recording stopped');
            //console.log('Recorded Blobs: ', this.recordedBlobs);

            var extType = 'video/mp4'
            if (typeof MediaRecorder.isTypeSupported == 'function') {
                extType = 'video/webm'
            }

            const blob = new Blob(this.recordedBlobs, { type: extType });
            this.recordedBlobs = [];

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            if (typeof MediaRecorder.isTypeSupported == 'function') {
                a.download = 'test.webm';                
            } else {
                a.download = 'test.mp4';                
            }
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

        };

        this.mediaRecorder.ondataavailable = (event) => {
            //console.log(event);
            this.uploadData(event.data);
            this.recordedBlobs.push(event.data);
        };

    }

    handleData(e) {
        e => {
            this.recordedBlobs.push(e.data);
        };
    }

    stopRecording(callback) {
        this.mediaRecorder.stop();
        //console.log("recorder stopped");

        var extType = 'mp4';
        if (typeof MediaRecorder.isTypeSupported == 'function') {
            extType = 'webm';
        }
        var metadata = {
            "type": extType,
            "invite_id": this.invite_id,
            "room": this.roomToken,
            "isRecordingStopped": 1,
            "isCompressingStarted": 0,
            "video_id": this.video_id,
            "isSocketUploading": 0
        }
        callback(metadata);
    }

     uploadData(blob) {
        var extType = 'mp4';
        var codecType = 'video/mp4';
        if (typeof MediaRecorder.isTypeSupported == 'function') {
            extType = 'webm';
            codecType = 'video/webm';
        }
        var metadata = {
            "type": extType,
            "invite_id": this.invite_id,
            "room": this.roomToken,
            "isRecordingStopped": 0,
            "isCompressingStarted": 0,
            "video_id": this.video_id,
            "isSocketUploading": 0
        }
        //console.log(metadata);
        this.uploadCallBack(blob, metadata, codecType);
    }



    

}

