const API_SERVER = window.location.origin;

function callAPI(path, method, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
            callback(JSON.parse(this.responseText));
        }
    });

    xhr.open(method, path);
    xhr.setRequestHeader("content-type", "application/json");
    xhr.setRequestHeader("cache-control", "no-cache");

    xhr.send(data);

}


function pageReady(request, response) {
    getInvites(function (result) {
        console.log(result);

        var container = document.getElementById('invite-records');
        if (result.data.length > 0) {
            result.data.forEach(function (item) {
                console.log('contact_info: ' + item.contact_info);

                var cardInvite = document.createElement('div');
                cardInvite.id = "card-invite";
                cardInvite.style.backgroundColor = 'aquamarine'

                if (item.isconnected === 0) {
                    cardInvite.style.backgroundColor = '#e0e0e0'
                }
                var content = document.createElement('p');
                content.id = 'card-invite-detail'
                content.textContent = item.contact_info;
                cardInvite.onclick = function () {
                    window.location.href = API_SERVER + "/invite/" + item.id;
                };

                cardInvite.appendChild(content);
                container.appendChild(cardInvite);
            });
        } else {
            var noP = document.createElement('p');
            noP.textContent = 'No Data Found !!'
            container.appendChild(noP);
        }
    })
}

function getInvites(callback) {
    callAPI(API_SERVER + "/get_invites", "GET", undefined, function (response) {
        callback(response);
    });
}