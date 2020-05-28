
const request = require("request");
const fs = require("fs");
const multiparty = require("multiparty");
let form = new multiparty.Form();
var rimraf = require("rimraf");

module.exports = {
    uploadVideo: function (videoname, videopath, metadatapath, callId, callLogId) {
        console.log('Uploading the video');

        var data = fs.readFileSync(metadatapath, 'utf-8');
        data = JSON.parse(data);
        data.isSocketUploading = 1;
        fs.writeFileSync(metadatapath, JSON.stringify(data));
        console.log(data);

        var APIURL = 'http://127.0.0.1:9090/upload';
        if(__dirname==='/var/www/html/Signaling'){
            APIURL = 'https://tethrlitepython.projectspreview.net/upload';
        }

        var options = {
            method: 'POST',
            url: APIURL,            
            headers:
                {
                    'cache-control': 'no-cache',
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
                },
            formData:
                {
                    metadata_file:
                        {
                            value: fs.createReadStream(metadatapath),
                            options: { filename: 'metadata.json', contentType: null }
                        },
                    video_file:
                        {
                            value: fs.createReadStream(videopath),
                            options: { filename: videoname, contentType: null }
                        },
                    callId: callId,
                    callLogId: callLogId
                }
        };

        request(options, function (error, response, body) {
            if (error) return;

            console.log(response.statusCode);
            console.log(body);
            if(response.statusCode != 200){
                var data = fs.readFileSync(metadatapath, 'utf-8');
                data = JSON.parse(data);
                data.isSocketUploading = 0;
                fs.writeFileSync(metadatapath,  JSON.stringify(data));
            }else{
                //video successfull uploaded remove directory
                rimraf.sync(metadatapath.replace('metadata.json', ''));
                console.log(videoname + "removed");
            }

        });
    }
}