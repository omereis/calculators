var idTargetCombo = 'combo_claculators_window';
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
function composeCountRemoteTagsMessage() {
    var message = getMessageStart();

    message['command'] = ServerCommands.GET_ALL_TAG_COUNT;
    message['fitter'] = 'refl1d';
    message['multi_processing'] = '';
    message['params'] = '';
    return (message);
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
function composeDeleteJobsMessage(arDelIDs) {
    var message = getMessageStart();

    message['command'] = ServerCommands.DELETE;
    message['fitter'] = 'refl1d';
    message['multi_processing'] = '';
    message['params'] = arDelIDs;
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
function composeLoadJobsByIDMessage(remoteID) {
    var message = getMessageStart();

    message['command'] = ServerCommands.JOB_DATA_BY_ID;
    message['fitter'] = 'refl1d';
    message['multi_processing'] = '';
    message['params'] = remoteID.toString();
    return (message);
}
//-----------------------------------------------------------------------------
function app_init() {
    $(window).on('storage', localStorageChange);
    tagsLocalToTable();
    onLoadRemoteTagsClick();
}
//-----------------------------------------------------------------------------
function tagsLocalToTable() {
    var n, astr, strTags = localStorage.getItem(get_refl1d_tag_name());
    if (strTags != null) {
        var cell, row, tbl = document.getElementById('tblTags');
        astr = strTags.split(',');
        for (n=0 ; n < astr.length ; n++) {
            if (astr[n].length > 0) {
                row = tbl.insertRow(tbl.rows.length);
                cell = row.insertCell(0);
                cell.innerHTML = '<input type="checkbox" id="' + astr[n] + '" onclick="onTagCheck(id)">' + astr[n];
                cell = row.insertCell(1);
                cell.style.textAlign="center";
                cell.innerText = '-';
            }
        }
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
    for (n=2 ; n < tbl.rows.length ; n++) {
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
    var cbox = document.getElementById(id);

    if (cbox.checked) {
        sendLoadByTag([id]);
    }
    else {
        removeJobByTagFromTable(id);
    }
    var count = countCheckedTags();
    var btn = document.getElementById('btnDelByTag');
    btn.disabled = (count == 0 ? true : false);
    document.getElementById('btnDelByTag').disabled = (count == 0 ? true : false);
    console.log(count);
/*
*/
}
//-----------------------------------------------------------------------------
function removeJobByTagFromTable(tag) {
    var row, rowTag, n, tbl = document.getElementById('tblRemoteJobs');

    for (n=1 ; n < tbl.rows.length ; ) {
        row = tbl.rows[n];
        if (row.cells[3].innerText == tag) {
        //if (row) {
            tbl.deleteRow(row.rowIndex);
        }
        else {
            n++;
        }
    }
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
        var jsonMsg;
        if (messageData.indexOf('"') >= 0) {
            jsonMsg = JSON.parse(messageData.replace(/\"/g,'\\\"').replace(/\'/g,'"'))
        }
        else {
            jsonMsg = JSON.parse(messageData.replace(/\"/g,'\\\"').replace(/\'/g,'"'))
        }
        //var jsonMsg = JSON.parse(messageData.replace(/\'/g,'\"'))
        if (jsonMsg.command == ServerCommands.GET_TAG_COUNT) {
//      if (jsonMsg.command == 'get_tag_count') {
            updateTagsCount(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.DEL_BY_TAG) {
            updateDeletedTags(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.LOAD_BY_TAG) {
            updateRemoteJobsTable(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.JOB_DATA_BY_ID) {
            remoteResultsToCharts(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.DELETE) {
            removeFromJobsTable(jsonMsg.params);
        }
        else if (jsonMsg.command == ServerCommands.GET_ALL_TAG_COUNT) {
            updateRemoteTagsCount(jsonMsg.params);
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
function deleteAllTableRows(table) {
    while (table.rows.length > 3) {
        table.deleteRow (3);
    }
}
//-----------------------------------------------------------------------------
function updateRemoteTagsCount(jsonMsgParams) {
    var n, row, astrRemoteTags = [];
    var tblLocal = document.getElementById('tblTags');
    var tblRemote = document.getElementById('tblRemoteTags');

    deleteAllTableRows(tblRemote);
    for (n=0 ; n < jsonMsgParams.length ; n++) {
        row = findRowByTagName (jsonMsgParams[n].job_id, tblLocal);
        if (row > 0) {
            updateTagCount (tblLocal, row, jsonMsgParams[n].count);
        }
        else {
            row = findRowByTagName (jsonMsgParams[n].job_id, tblRemote);
            if (row > 0) {
                updateTagCount (tblRemote, row, jsonMsgParams[n].count);
            }
            else {
                addTagRow (tblRemote, jsonMsgParams[n].job_id, jsonMsgParams[n].count);
            }
        }
        astrRemoteTags.push(jsonMsgParams[n].job_id)
    }
    localStorage.setItem('remote_tags', astrRemoteTags.join(','));
}
//-----------------------------------------------------------------------------
function updateTagCount (table, row, count) {
    table.rows[row].cells[1].innerText = count.toString();
}
//-----------------------------------------------------------------------------
function incrementTagCount (table, row) {
    var count;

    try {
        count = Number(table.rows[row].cells[1].innerText);
        if (isNaN(count)) {
            count = 0;
        }
    }
    catch (err) {
        count = 0;
        console.log(err);
    }
    updateTagCount (table, row, count + 1);
}
//-----------------------------------------------------------------------------
function addCountCell (row, count) {
    var cell = row.insertCell(1);
    cell.style.textAlign="center";
    cell.innerText = count.toString();
}
//-----------------------------------------------------------------------------
function addTagRow (table, job_id, count) {
    var row;

    try {
        row = table.insertRow(table.rows.length);
        addTagCheckbox (row, job_id);
        addCountCell (row, count);
    }
    catch (err) {
        console.log(err);
    }
}
//-----------------------------------------------------------------------------
function addTagCheckbox (row, job_id) {
    var cell = row.insertCell(0);
    cell.innerHTML = '<input type="checkbox" id="' + job_id + '" onclick="onTagCheck(id)">' + job_id;
}
//-----------------------------------------------------------------------------
function findRowInTable (table, column, content) {
    var n, cell, nFound = -1;

    for (n=0 ; (n < table.rows.length) && (nFound < 0) ; n++) {
        cell = table.rows[n].cells[column];
        if (cell.innerText == content) {
            nFound = n;
        }
    }
    return (nFound);
}
//-----------------------------------------------------------------------------
function findRowByTagName (tagName, table) {
    return (findRowInTable (table, 0, tagName));
/*
        var n, cell, nFound = -1;

    for (n=0 ; (n < table.rows.length) && (nFound < 0) ; n++) {
        cell = table.rows[n].cells[0];
        if (cell.innerText == tagName) {
            nFound = n;
        }
    }
    return (nFound);
*/
}
//-----------------------------------------------------------------------------
function uploadCheckedTags() {
    var n, astr, strTags = localStorage.getItem(get_refl1d_tag_name());
    var astrChecked = [];

    astr = strTags.split(',');
    astrChecked = getCheckedByIDs(astr);
    return (astrChecked);
}
//-----------------------------------------------------------------------------
function getCheckedByIDs(astr) {
    var n, cbox, astrChecked = [];

    for (n=0 ; n < astr.length ; n++) {
        try {
            cbox = document.getElementById(astr[n]);
            if (cbox.checked) {
                astrChecked.push(astr[n]);
            }
        }
        catch (err) {
            console.log(err);
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
    if (confirm('Please confirm deletion of tags ' + astrChecked.join(',') + ' and their jobs')) {
        var message = composeDelJobsByCountMessage(astrChecked);
        sendWSMessage (message);
    }
}
//-----------------------------------------------------------------------------
function deleteTagRowByTag (jobTag) {
    try {
        var cbox = document.getElementById(jobTag);
        var row = cbox.parentElement.parentElement;
        var tbl = row.parentElement.parentElement;
        tbl.deleteRow (row.rowIndex);
    }
    catch (eer) {
        console.log.og(err);
    }
}
//-----------------------------------------------------------------------------
function deleteJobRowByTag(tag) {
    var row, n, tbl = document.getElementById('tblRemoteJobs');

    for (n=1 ; n < tbl.rows.length ; ) {
        row = tbl.rows[n];
        if (row.cells[3].innerText == tag) {
            tbl.deleteRow(n);
        }
        else {
            n++;
        }
    }
}
//-----------------------------------------------------------------------------
function updateDeletedTags(astrDelTags) {
    var n, iDel, astrLocalTags, strTags = localStorage.getItem(get_refl1d_tag_name());
    var astr=[];

    if (strTags.indexOf('runtime error') >= 0) {
        var astrChecked = uploadCheckedTags();
        for (n=0 ; n < astrChecked.length ; n++) {
            var cbox = document.getElementById(astr[n]);
            var rowElement = cbox.parentElement.parentElement;
            tbl.deleteRow(rowElement.rowIndex);
        }
    }
    else {
        astrLocalTags = strTags.split(',');
        for (n=0 ; n < astrDelTags.length ; n++) {
            deleteTagRowByTag (astrDelTags[n]);
            deleteJobRowByTag(astrDelTags[n]);
            iDel = astrLocalTags.indexOf(astrDelTags[n]);
            if (iDel >= 0) {
                astrLocalTags.splice (iDel, 1);
            }
        }
        localStorage.setItem(get_refl1d_tag_name(), astrLocalTags.join(','));
    }
}
//-----------------------------------------------------------------------------
function onLoadByTagClick() {
    var astrChecked = uploadCheckedTags();
    sendLoadByTag(astrChecked);
}
//-----------------------------------------------------------------------------
function sendLoadByTag(astrChecked) {
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
        jsonJobToRow (row, jsonParams, jsonParams.job_id);
    }
}
//-----------------------------------------------------------------------------
function getRemotejobPretext () {
    return ('remote_job_');
}
//-----------------------------------------------------------------------------
function getJsonKeys (json) {
    var k, ak = [];

    for (k in json) {
        ak.push (k);
    }
    return (ak);
}
//-----------------------------------------------------------------------------
function getRemoteJobCheckbox (job_id) {
    return ('<input type="checkbox" id="' + getRemotejobPretext() + job_id + '">');
}
//-----------------------------------------------------------------------------
function getRemoteJobButton (remoteID, addButton=true) {
    var strContent;
    if (addButton) {
        strContent = '<input type="button" id="' + composeJobElementID (remoteID) + '" value="Load job ' + remoteID + '" onclick="onLoadRemoteJobClick(' + remoteID + ')">';
    }
    else {
        strContent = remoteID;
    }
    return (strContent);
}
//-----------------------------------------------------------------------------
function getWindowsSelection(idCombo) {
    var strWindow, txtNames = localStorage.getItem('calculators_window');
    var astrNames = txtNames.split(',');
    if (astrNames.length == 0) {
        strWindow = '';
    }
    var strItems = '';
    for (var n=0 ; n < astrNames.length ; n++) {
        strItems += '<option value="' + astrNames[n] + '">' + astrNames[n] + '</option>';
    }
    strWindow = '<select id="' + idCombo + '">' + strItems + '</select>';
    return (strWindow);
}
//-----------------------------------------------------------------------------
function getTargetComboID (jsonParams) {
    var aKeys = getJsonKeys (jsonParams);
    if (aKeys.indexOf('local_id') >= 0) {
        strTarget = idTargetCombo + '_' + jsonParams.local_id.toString();
    }
    else {
        strTarget = idTargetCombo + '_' + jsonParams.job_id.toString();
    }
    return (strTarget);
}
//-----------------------------------------------------------------------------
function jsonJobToRow (row, jsonParams, remoteID) {
    var cell, n=0;
    var aKeys = getJsonKeys (jsonParams);

    while (row.cells.length > 0) {
        row.deleteCell(0);
    }

    row['remote_id'] = jsonParams.job_id;

    cell = row.insertCell (n++);

    if (aKeys.indexOf ('job_id') >= 0) {
        cell.innerHTML = getRemoteJobCheckbox (jsonParams.job_id);

        cell = row.insertCell (n++);
        cell.innerHTML = getRemoteJobButton (remoteID);
    }
    else if (aKeys.indexOf ('local_id')) {
        cell.innerText = ' '
        cell = row.insertCell (n++);
        cell.innerHTML = jsonParams.local_id
    }


    cell = row.insertCell (n++);
    cell.innerText = jsonParams.problem_name;

    cell = row.insertCell (n++);
    cell.innerText = jsonParams.tag;

    cell = row.insertCell (n++);

    cell.innerHTML = getWindowsSelection(getTargetComboID (jsonParams));
    if (aKeys.indexOf('window_name') >= 0) {
        selectTargetWindow (getTargetComboID (jsonParams), jsonParams.window_name);
    }

    cell = row.insertCell (n++);
    cell.innerText = jsonParams.sent_date;

    cell = row.insertCell (n++);
    cell.innerText = jsonParams.sent_time;

    cell = row.insertCell (n++);
    cell.innerText = jsonParams.chi_square;
}
//-----------------------------------------------------------------------------
function onLoadRemoteJobClick(remoteID) {
    var message = composeLoadJobsByIDMessage(remoteID);
    sendWSMessage (message);
}
//-----------------------------------------------------------------------------
function remoteResultsToCharts(jsonParams) {
    var strTable = '';
    if (jsonParams.length > 0) {
        if (jsonParams[0].hasOwnProperty('error')) {
            alert ('Error in job #' + jsonParams[0].job_id + '\n' + jsonParams[0].error);
        }
        else {
            var id = getRemotejobPretext () + jsonParams[0].job_id;
            var btn = document.getElementById(id);
            var row = btn.parentElement.parentElement;
            var target = row.cells[4].innerHTML;
            var cb = jQuery.parseHTML(target);
            var select = document.getElementById(cb[0].id);
            var target_name = select.item(select.options.selectedIndex).value;
            jsonParams[0]['window_name'] = target_name;
            localStorage.setItem('refl1d_remote_fit', JSON.stringify(jsonParams[0]));
            localStorage.removeItem('refl1d_remote_fit');
        }
    }
    console.log(strTable);
    console.log(jsonParams);
}
//-----------------------------------------------------------------------------
// source: https://www.w3resource.com/javascript-exercises/javascript-string-exercise-28.php
function hex_to_ascii(str1)
 {
	var hex  = str1.toString();
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
 }
//-----------------------------------------------------------------------------
function onClearClick() {
    var tbl = document.getElementById('tblRemoteJobs');
    
    while (tbl.rows.length > 1) {
        tbl.deleteRow(1);
    }
}
//-----------------------------------------------------------------------------
function onDeleteJobsClick() {
    var n, tbl = document.getElementById('tblRemoteJobs'), arDelIDs = [];

    for (n=1 ; n < tbl.rows.length ; n++) {
        if (tbl.rows[n].cells.length > 0) {
            var jc = jQuery.parseHTML(tbl.rows[n].cells[0].innerHTML);
            var cbox = document.getElementById(jc[0].id);
            if (cbox.checked){
                var id = jc[0].id.substring(getRemotejobPretext().length, jc[0].id.length);
                arDelIDs.push(id);
            }
        }
    }
    if (confirm('Please confirm deletion of jobs ' + arDelIDs.join(','))) {
        var message = composeDeleteJobsMessage (arDelIDs);
        sendWSMessage (message);
    }
}
//-----------------------------------------------------------------------------
function removeFromJobsTable(jsonParams) {
    var n, tbl = document.getElementById('tblRemoteJobs');

    for (n=0 ; n < jsonParams.length ; n++) {
        var id = getRemotejobPretext () + jsonParams[n];
        var row = document.getElementById(id).parentElement.parentElement;
        tbl.deleteRow(row.rowIndex);
    }
}
//-----------------------------------------------------------------------------
function onLoadRemoteTagsClick() {
    var message = composeCountRemoteTagsMessage();
    sendWSMessage (message);
}
//-----------------------------------------------------------------------------
function onDeleteRemoteTagsClick() {
    var strRemoteChecked = localStorage.getItem('remote_tags');
    var astr = strRemoteChecked.split(',');

    var astrChecked = getCheckedByIDs(astr);
    if (confirm('Please confirm deletion of tags ' + astrChecked.join(',') + ' and their jobs')) {
        var message = composeDelJobsByCountMessage(astrChecked);
        sendWSMessage (message);
    }
}
//-----------------------------------------------------------------------------
function localStorageChange (ev) {
    if (ev.originalEvent.key == 'refl1d_remote_fit_sent') {
        var strMessage = ev.originalEvent.newValue;
        if (strMessage != null) {
            var jsonMessage = JSON.parse(strMessage);
            handleNewFitJobSent (JSON.parse(strMessage));
        }
    }
    else if (ev.originalEvent.key == 'remote_id_local_id') {
        var strMessage = ev.originalEvent.newValue;
        if (strMessage != null) {
            updateRemoteIdFromLocalId (JSON.parse(strMessage));
        }
    }
    else if (ev.originalEvent.key == 'refl1d_fit_completed') {
        var strMessage = ev.originalEvent.newValue;
        if (strMessage != null) {
            updateCompletedRefl1dFit (JSON.parse(strMessage));
        }
    }
    else if (ev.originalEvent.key == 'calculators_window') {
        handleCalculatorWindowOpenClose();
    }
}
//-----------------------------------------------------------------------------
function handleNewFitJobSent (jsonMessage) {
    incrementLocalTag (jsonMessage.tag);
    addRemoteJob(jsonMessage);
    console.log(jsonMessage);
}
//-----------------------------------------------------------------------------
function incrementLocalTag (messageTag) {
    var tblLocal = document.getElementById('tblTags');
    var row = findRowByTagName (messageTag, tblLocal);
    if (row > 0) {
        incrementTagCount (tblLocal, row);
    }
    else {
            addTagRow (tblLocal, messageTag, 1);
    }
}
//-----------------------------------------------------------------------------
const monthNames = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
//-----------------------------------------------------------------------------
function addRemoteJob(jsonMessage) {
    var row, n, tbl = document.getElementById('tblRemoteJobs');
    jsonMessage.sent_date = monthNames[jsonMessage.message_time.month - 1] + ' ' + jsonMessage.message_time.date.toString() + ', ' + jsonMessage.message_time.year.toString();

    var strMin = jsonMessage.message_time.minutes.toString();
    if (jsonMessage.message_time.minutes < 10) {
        strMin = '0' + strMin;
    }
    jsonMessage.sent_time = jsonMessage.message_time.minutes.toString() + ':' + strMin;
    jsonMessage.chi_square = '-'

    row = tbl.insertRow(tbl.rows.length);
    jsonJobToRow (row, jsonMessage, jsonMessage.local_id);
    console.log(jsonMessage);
}
//-----------------------------------------------------------------------------
function updateRemoteIdFromLocalId (jsonMessage) {
    var idRemote, idLocal, keys;

    var table = document.getElementById('tblRemoteJobs');
    keys = getJsonKeys (jsonMessage);
    idLocal = keys[0];
    idRemote = jsonMessage[idLocal];
    console.log(idLocal);
    var row = findRowInTable (table, 1, idLocal);
    if (row > 0) {
        table.rows[row].cells[0].innerHTML = getRemoteJobCheckbox (idRemote);
        table.rows[row].cells[1].innerHTML = getRemoteJobButton (idRemote, false);
    }
}
//-----------------------------------------------------------------------------
function getComboIndexOf (combo, option) {
    var n, iFound = -1;

    for (n=0 ; (n < combo.options.length) && (iFound < 0) ; n++) {
        if (combo.item(n).value == option) {
            iFound = n;
        }
    }
    return (iFound);
}
//-----------------------------------------------------------------------------
function selectTargetWindow (idCombo, windowName) {
    var combo = document.getElementById(idCombo);
    var idx = getComboIndexOf (combo, windowName);
    if (idx >= 0) {
        combo.options.selectedIndex = idx;
    }
}
//-----------------------------------------------------------------------------
function updateCompletedRefl1dFit (jsonMessage) {
    try {
        var table = document.getElementById('tblRemoteJobs');
        var row = findRowInTable (table, 1, jsonMessage.job_id);
        if (row > 0) {
            table.rows[row].cells[1].innerHTML = getRemoteJobButton (jsonMessage.job_id, true);
            table.rows[row].cells[7].innerText = jsonMessage.chi_square;
        }
    }
    catch (err) {
        console.log(err);
    }
}
//-----------------------------------------------------------------------------
function onSelectAllJobsClick(id) {
    var cbox = document.getElementById(id);
    var checked = cbox.checked;
    var table = document.getElementById('tblRemoteJobs');
    for (var n=1 ; n < table.rows.length ; n++) {
        var jc = jQuery.parseHTML(table.rows[n].cells[0].innerHTML);
        cbox = document.getElementById(jc[0].id);
        cbox.checked = checked;
    }
}
//-----------------------------------------------------------------------------
function handleCalculatorWindowOpenClose() {
    var op, strDiff=null, astrNew, astrCurrent, txtNames = localStorage.getItem('calculators_window');
    var tbl = document.getElementById('tblRemoteJobs');        
    for (var n=1 ; n < tbl.rows.length ; n++) {
        var cell = tbl.rows[n].cells[4];
        var remoteID = tbl.rows[n].remote_id;
        var idCombo = idTargetCombo + '_' + remoteID.toString();
        cell.innerHTML = getWindowsSelection(idCombo);
    }
}
//-----------------------------------------------------------------------------
function addWindowSelect(tbl, strDiff) {
    var opt = document.createElement('option');
    opt.value = strDiff;
    opt.innerHTML = strDiff;
    for (var n=1 ; n < tbl.rows.length ; n++) {
        cell = tbl.rows[n].cells[4];
        cb = jQuery.parseHTML(cell.innerHTML);
        var select = document.getElementById(cb[0].id);
        select.appendChild(opt);
    }
}
//-----------------------------------------------------------------------------
function delWindowSelect(tbl, strDiff) {
    var iDel, iCurrent, strCurrentOption=null;
    for (var n=1 ; n < tbl.rows.length ; n++) {
        cell = tbl.rows[n].cells[4];
        cb = jQuery.parseHTML(cell.innerHTML);
        var select = document.getElementById(cb[0].id);
        iCurrent = select.selectedIndex;
        iDel = selectOptionIndex (select, strDiff);
        if (iDel >= 0) {
            if (iDel != iCurrent) {
                strCurrentOption = select.options[iCurrent].value;
            }
            select.options[iDel] = null; // actual deletion
            if (strCurrentOption) {
                select.selectedIndex = selectOptionIndex (select, strCurrentOption);
            }
        }
    }
}
//-----------------------------------------------------------------------------
function selectOptionIndex (select, strDiff) {
    var iFound;
    for (var n=0, iFound=-1 ; (n < select.options.length) && (iFound < 0) ; n++) {
        if (strDiff == select.options[n].value) {
            iFound = n;
        }
    }
    return (iFound);
}
//-----------------------------------------------------------------------------
function getWindowSelectOptions() {
    var cb, astr = [], tbl = document.getElementById('tblRemoteJobs');
    if (tbl.rows.length > 1) {
        cell = tbl.rows[1].cells[4];
        cb = jQuery.parseHTML(cell.innerHTML);
        for (var n=0 ; n < cb[0].options.length ; n++) {
            astr.push(cb[0].options[n].value);
        }
/*
        if (cb[0].hasOwnProperty('options')) {
            for (var n=0 ; n < cb[0].options.length ; n++) {
                astr.push(cb[0].options[n].value);
            }
        }
        else { //the cell contains just text
            astr.push(cb[0].wholeText);
        }
    */
    }
    return (astr);
  }
//-----------------------------------------------------------------------------
