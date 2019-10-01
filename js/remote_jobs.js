function app_init() {
    tagsLocalToTable();
}

function tagsLocalToTable() {
    var n, astr, strTags = localStorage.getItem(get_refl1d_tag_name());
    var cell, row, tbl = document.getElementById('tblTags');
    astr = strTags.split(',');
    for (n=0 ; n < astr.length ; n++) {
        row = tbl.insertRow(tbl.rows.length);
        cell = row.insertCell(0);
        cell.innerText = astr[n];
        cell = row.insertCell(1);
        cell.innerText = '-';
    }
}
function get_refl1d_tag_name() {
    return ('refl1d_sent_tags');
}
  