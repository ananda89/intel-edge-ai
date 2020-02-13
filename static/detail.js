var minVideo;
var canvas, ctx;
var last;
var interval = 30;
var seekbar;
function pageReady(request, response) {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    const data = JSON.parse(document.getElementById('data').textContent)

    var videoData = data[0];
    console.log(data);

    var statusElem = document.getElementById('status-content')
    if (videoData.status == 0) {
        statusElem.textContent = 'PENDING';
        statusElem.style.color = 'orange';
    } else if (videoData.status == 1) {
        statusElem.textContent = 'Extracting information from video';
        statusElem.style.color = '#651fff';
    } else if (videoData.status == 2) {
        statusElem.textContent = 'Complete';
        statusElem.style.color = '#1de9b6';
    }

    if (videoData.path == undefined) {
        canvas.style.background = "black";
    } else {

        var video_url = videoData.path;
        video_url = video_url.replace('./', '')
        loadVideo(window.origin + "/" + video_url);
    }


}

function createSeekBar() {
    seekbar = document.createElement('input');
    seekbar.type = 'range'
    seekbar.style.width = canvas.width+"px";
    setSeekBar();
    minVideo.addEventListener('timeupdate', updateTime, false);
    minVideo.addEventListener('durationchange', setSeekBar, false);

    seekbar.onchange = changeTheTime;

    document.getElementById('video-box').appendChild(seekbar);
    console.log('seekbar created')
}

// fires when page loads, it sets the min and max range of the video
function setSeekBar() {
    seekbar.min = 0;
    seekbar.max = minVideo.duration;
}

// fires when seekbar is changed
function changeTheTime() {
    minVideo.currentTime = seekbar.value;
}

function updateTime() {
    var sec = minVideo.currentTime;
    var h = Math.floor(sec / 3600);
    sec = sec % 3600;
    var min = Math.floor(sec / 60);
    sec = Math.floor(sec % 60);
    if (sec.toString().length < 2) sec = "0" + sec;
    if (min.toString().length < 2) min = "0" + min;
    // document.getElementById('lblTime').innerHTML = h + ":" + min + ":" + sec;

    seekbar.min = minVideo.startTime;
    seekbar.max = minVideo.duration;
    seekbar.value = minVideo.currentTime;
}

// fires when Play button is clicked
function PlayNow() {
    if (video.paused) {
        video.play();
    } else if (video.ended) {
        video.currentTime = 0;
        video.play();
    }
}

// fires when Pause button is clicked
function PauseNow() {
    if (video.play) {
        video.pause();
    }
}

function loadVideo(video_url) {
    minVideo = document.createElement("video", { autoPlay: true }); // create a video element
    minVideo.setAttribute("playsinline", null);
    minVideo.setAttribute("autoPlay", true);
    minVideo.controls = true;

    createSeekBar();

    // minVideo.muted = true;
    // document.body.appendChild(minVideo);

    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;
    // ctx.canvas.width = window.innerWidth;
    // ctx.canvas.height = window.innerHeight;

    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        // canvas.width = window.innerWidth;
        // canvas.height = window.innerHeight;
        // ctx.canvas.width = window.innerWidth;
        // ctx.canvas.height = window.innerHeight;
        drawStuff();
    }

    minVideo.src = video_url;
    setTimeout(function () {
        minVideo.play();
    }, 50);

    minVideo.addEventListener('play', function () {
        last = performance.now();
        window.requestAnimationFrame(draw);
    }, 0);

}


function draw(time) {

    if (time - last > interval) {
        drawStuff();
        last = time;
    }
    window.requestAnimationFrame(draw);
}

var scale, vidH, vidW, topA, left;
function drawStuff() {
    // canvas.width = canvas.width;

    scale = Math.min(
        canvas.width / minVideo.videoWidth,
        canvas.height / minVideo.videoHeight);
    vidH = minVideo.videoHeight;
    vidW = minVideo.videoWidth;
    topA = canvas.height / 2 - (vidH / 2) * scale;
    left = canvas.width / 2 - (vidW / 2) * scale;
    ctx.drawImage(minVideo, left, topA, vidW * scale, vidH * scale);

}