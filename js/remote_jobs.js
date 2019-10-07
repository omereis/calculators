//-----------------------------------------------------------------------------
function getMessageStart() {
    var message = new Object;
  
    message['header'] = 'bumps client';
    message['tag']    = '';
    message['message_time'] = getMessageTime();
    return (message);
}
//-----------------------------------------------------------------------------
function getMessageTime() {
    var d = new Date;
    var date_json = {};
    date_json['year'] = d.getFullYear();
    date_json['month'] = (d.getMonth() + 1);
    date_json['date'] = d.getDate();
    date_json['hour'] = d.getHours();
    date_json['minutes'] = d.getMinutes();
    date_json['seconds'] = d.getSeconds();
    date_json['milliseconds'] = d.getMilliseconds();
    return (date_json);
}
//-----------------------------------------------------------------------------
function composeCountJobsMessage() {
    var message = getMessageStart();
    var strTags = localStorage.getItem(get_refl1d_tag_name());  

    message['command'] = ServerCommands.GET_TAG_COUNT;
    message['fitter'] = 'refl1d';
    message['multi_processing'] = '';
    message['params'] = strTags;
    return (message);
}
//-----------------------------------------------------------------------------
function composeDelJobsByCountMessage(astrChecked) {
    var message = getMessageStart();

    message['command'] = ServerCommands.DEL_BY_TAG;
    message['fitter'] = 'refl1d';
    message['multi_processing'] = '';
    message['params'] = astrChecked.join(',');
    return (message);
}
//-----------------------------------------------------------------------------
function composeLoadJobsByCountMessage(astrChecked) {
    var message = getMessageStart();

    message['command'] = ServerCommands.LOAD_BY_TAG;
    message['fitter'] = 'refl1d';
    message['multi_processing'] = '';
    message['params'] = astrChecked.join(',');
    return (message);
}
//-----------------------------------------------------------------------------
function app_init() {
    tagsLocalToTable();
}
//-----------------------------------------------------------------------------
function tagsLocalToTable() {
    var n, astr, strTags = localStorage.getItem(get_refl1d_tag_name());
    var cell, row, tbl = document.getElementById('tblTags');
    astr = strTags.split(',');
    for (n=0 ; n < astr.length ; n++) {
        row = tbl.insertRow(tbl.rows.length);
        cell = row.insertCell(0);
        cell.innerHTML = '<input type="checkbox" id="' + astr[n] + '" onclick="onTagCheck(id)">' + astr[n];
        cell = row.insertCell(1);
        cell.style.textAlign="center";
        cell.innerText = '-';
       
    }
}
//-----------------------------------------------------------------------------
function onRefreshTagsClick() {
    var n, tbl = document.getElementById('tblTags');
    var astr = localStorage.getItem(get_refl1d_tag_name()).split(',');
    
    for (n=0 ; n < astr.length ; n++) {
        var cbox = document.getElementById(astr[n]);
        var rowElement = cbox.parentElement.parentElement;
        tbl.deleteRow(rowElement.rowIndex);
    }
    tagsLocalToTable();
}
//-----------------------------------------------------------------------------
function countCheckedTags() {
    var tbl, n, nCount=0, jc, cbox;

    tbl = document.getElementById('tblTags');
    for (n=3 ; n < tbl.rows.length ; n++) {
        jc = jQuery.parseHTML(tbl.rows[n].cells[0].innerHTML);
        cbox = document.getElementById(jc[0].id);
        if (cbox.checked){
            nCount++;
        }
    }
    return (nCount);
}
//-----------------------------------------------------------------------------
function onTagCheck(id) {
    var count = countCheckedTags();
    var btn = document.getElementById('btnDelByTag');
    btn.disabled = (count == 0 ? true : false);
    document.getElementById('btnLoadByTag').disabled = (count == 0 ? true : false);
    console.log(count);
}
//-----------------------------------------------------------------------------
function get_refl1d_tag_name() {
    return ('refl1d_sent_tags');
}
//function openWSConnection(protocol, hostname, port, endpoint) {
function openWSConnection(webSocketURL, msgData) {
    console.log("openWSConnection::Connecting to: " + webSocketURL);
    try {
        webSocket = new WebSocket(webSocketURL);
        webSocket.message = msgData;
        webSocket.addEventListener('error', (event) => {
            console.log('in addEventListener');
            console.log(event);
        });
        webSocket.onopen = function(openEvent) {
            console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
            webSocket.send(msgData);
        };
        webSocket.onclose = function (closeEvent) {
            console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
        };
        webSocket.onerror = function (errorEvent) {
            var msg = "WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4);
            console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
            if (JSON.parse(webSocket.message).command == ServerCommands.COMM_TEST) {
                var spn = document.getElementById('spanTestCommResult');
                spn.style.color = 'red';
                spn.innerText = msg;
            }
            console.log(msg);
        };
        webSocket.onmessage = function (messageEvent) {
            handleWSReply (messageEvent.data);
            console.log("WebSocket MESSAGE: " + messageEvent.data);
            webSocket.close();
        };
    } catch (exception) {
        console.error(exception);
    }
}
//-----------------------------------------------------------------------------
function onCountJobs () {
    try {
        var remoteData = loadLocalServerParams ();
        var webSocketUrl = composeWebSocketURL (remoteData.server, remoteData.port);
        var message = composeCountJobsMessage();
        openWSConnection(webSocketUrl, JSON.stringify(message));
    }
    catch (err) {
        alert (err.message);
    }
}
//-----------------------------------------------------------------------------
function messageHandler (message) {
    console.log(message);
}
//-----------------------------------------------------------------------------
function message_to_json(wsMsg) {
    var n, amsg = wsMsg.split(':');
    var j = {};

    for (n=0 ; n < amsg.length ; n += 2) {
        j[amsg[n]] = amsg[n+1];
    }

    return (j);
}
//-----------------------------------------------------------------------------
function handleWSReply (messageData) {
    try{
        var jsonMsg = JSON.parse(messageData.replace(/\'/g,'\"'))
        if (jsonMsg.command == 'get_tag_count') {
            updateTagsCount(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.DEL_BY_TAG) {
            updateDeletedTags(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.LOAD_BY_TAG) {
            updateRemoteJobsTable(jsonMsg.params);
        }
        console.log(jsonMsg);
    }
    catch (err) {
        console.log(err);
    }
}
//-----------------------------------------------------------------------------
function updateTagsCount(params) {
    var n, cell, row, cellCount;

    for (n=0 ; n < params.length ; n++) {
        id = params[n].job_id;
        cell = document.getElementById(id);
        cell.innerText = params[n].Count;
        row = cell.parentElement.parentElement;
        cellCount = row.cells[1];
        cellCount.innerText = params[n].count;
    }
}
//-----------------------------------------------------------------------------
function uploadCheckedTags() {
    var n, astr, strTags = localStorage.getItem(get_refl1d_tag_name());
    var astrChecked = [];

    astr = strTags.split(',');
    for (n=0 ; n < astr.length ; n++) {
        var cbox = document.getElementById(astr[n]);
        if (cbox.checked) {
            astrChecked.push(astr[n]);
        }
    }
    return (astrChecked);
}
//-----------------------------------------------------------------------------
function sendWSMessage (message) {
    var remoteData = loadLocalServerParams ();
    var webSocketUrl = composeWebSocketURL (remoteData.server, remoteData.port);
    openWSConnection(webSocketUrl, JSON.stringify(message));
}
//-----------------------------------------------------------------------------
function onDeleteByTagClick() {
    var astrChecked = uploadCheckedTags();
    console.log(astrChecked);
    var message = composeDelJobsByCountMessage(astrChecked);
    sendWSMessage (message);
}
//-----------------------------------------------------------------------------
function deleteRowByJobTag (jobTag) {
    var tblTags = document.getElementById('tblTags');
    var row, deleted=false;

    for (row=3 ; (row < tblTags.rows.length) && (!deleted) ; row++) {
        var jc = jQuery.parseHTML(tblTags.rows[row].cells[0].innerHTML);
        if (jc[0].id == jobTag) {
            tblTags.deleteRow(row);
            deleted = true;
        }
    }
}
//-----------------------------------------------------------------------------
function updateDeletedTags(astrDelTags) {
    var n, astrLocalTags, strTags = localStorage.getItem(get_refl1d_tag_name());
    var astr=[];

    astrLocalTags = strTags.split(',');
    for (n=0 ; n < astrLocalTags.length ; n++) {
        if (astrDelTags.indexOf(astrLocalTags[n]) >= 0) {
            deleteRowByJobTag (astrLocalTags[n]);
        }
        else{
            astr.push (astrLocalTags[n]);
        }
    }
    localStorage.setItem(get_refl1d_tag_name(), astr);
}
//-----------------------------------------------------------------------------
function onLoadByTagClick() {
    var astrChecked = uploadCheckedTags();
    var message = composeLoadJobsByCountMessage(astrChecked);
    sendWSMessage (message);
}
//-----------------------------------------------------------------------------
function composeJobElementID (remote_id) {
    var jobElementID = 'remoet_job_' + remote_id.toString();
    return (jobElementID);
}
//-----------------------------------------------------------------------------
function updateRemoteJobsTable(arrayParams) {
    var row, n, tbl = document.getElementById('tblRemoteJobs');
    for (n=0 ; n < arrayParams.length ; n++) {
        jsonParams = arrayParams[n];
        id = composeJobElementID (jsonParams.job_id);
        var btn = document.getElementById(id);
        if (btn == null) {
            row = tbl.insertRow(tbl.rows.length);
        }
        else {
            row = btn.parentElement.parentElement;
        }
        jsonJobToRow (row, jsonParams);
    }
    row = tbl.insertRow(tbl.rows.length);
    console.log(jsonParams);
}
//-----------------------------------------------------------------------------
function jsonJobToRow (row, jsonParams) {
    var cell;

    for (var n=0 ; n < row.cells.length ; n++) {
        row.deleteCell(0);
    }
    cell = row.insertCell (0);
    cell.innerHTML = '<input type="button" id="' + composeJobElementID (jsonParams.job_id) + '" value="Load job ' + jsonParams.job_id + '">'

    cell = row.insertCell (1);
    cell.innerText = jsonParams.tag;

    cell = row.insertCell (2);
    cell.innerText = jsonParams.sent_date;

    cell = row.insertCell (3);
    cell.innerText = jsonParams.sent_time;

    cell = row.insertCell (4);
    cell.innerText = jsonParams.chi_square;
}
//-----------------------------------------------------------------------------
