//import * as d3 from 'd3';
//import $ from 'jquery';
//import {layout} from 'jquery-layout';
//import XYChart from '../../d3-science/lib/xy-chart';
//import default as profileInteractor from '../../d3-science/profile-interactor';
"use strict";
/*
var JSZip = document.createElement('script');
try {
  JSZip.src = 'zip/JSZip.js';
}
catch (err) {
  alert (err.message);
}
*/
//var THETA_M = Math.PI * 3.0 / 2.0; // 270 degrees by default
var THETA_M = 1.0/2.0; // 90 degrees by default.
var AGUIDE = 270;

var data_file_content = null;  // debug note
var webSocket = null;
var webSocketURL = "ws://localhost:4567";
var timerRemoteStatus = null;

//-----------------------------------------------------------------------------
function composeRefl1dFitMessage(txtProblem) {
  var message = getMessageStart();

  message['command'] = ServerCommands.START_FIT;
  message['refl1d_problem'] = txtProblem;
  message['fitter'] = 'refl1d';
  return (message);
}
//-----------------------------------------------------------------------------
function composeRefl1dFitResults(remoteID) {
  var message = getMessageStart();

  message['command'] = ServerCommands.GET_REFL1D_RESULTS;
  message['params'] = remoteID;//.toString();
  message['fitter'] = 'refl1d';
  return (message);
}
//-----------------------------------------------------------------------------
function composeRefl1dStatusMessage() {
  var message = null, id = uploadRemoteID();
  if (Number(id) > 0) {
    message = getMessageStart();
    message['command'] = ServerCommands.GET_STATUS;
    message['params'] = id;
    message['fitter'] = 'refl1d';
  }
  return (message);
}
//-----------------------------------------------------------------------------
function uploadRemoteID() {
  var id;
  //var s = document.getElementById('spanRemoteID');
  var s = document.getElementById('inRemoteID');
  if (s)
    //id = s.innerText;
    id = s.value;
  else
    id = '';
  return (id);
}
//-----------------------------------------------------------------------------
function getMessageStart() {
  var message = new Object;

  message['header'] = 'bumps client';
  message['tag']    = uploadTag();
  message['message_time'] = getMessageTime();
  return (message);
}
//-----------------------------------------------------------------------------
function uploadTag() {
  var tag = document.getElementById('remote_tag').value;
  if (tag == '')
      tag = generateTag();
      //tag = generateTag('remote_tag');
  return (tag);
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
var app_options = {
  initial_sld: [
    {thickness: 0, sld: 4.0, mu: 0, thetaM: THETA_M, sldm: 0, sldi: 0.0, roughness: 10},
    {thickness: 200, sld: 2.0, mu: 0, thetaM: 0.0, sldm: 1.0, sldi: 0.0, roughness: 10},
    {thickness: 200, sld: 4.0, mu: 0, thetaM: THETA_M, sldm: 1.0, sldi: 0.0, roughness: 10},
    {thickness: 0, sld: 0.0, mu: 0, thetaM: THETA_M, sldm: 0, sldi: 0.0, roughness: 0}
  ],
  to_fit: [{roughness: true}, {thickness: true, sldm: true}, {}, {}],
  plot_choices: {
    'reflectivity':   {data: 'xy', xlabel: '2*k_in (Å⁻¹)', ylabel: 'R (I/I₀)', title:'Reflectivity R=|Ψ←(z=-∞)|²'},
    'phase':          {data: 'phase', xlabel: 'Q (Å⁻¹)', ylabel: 'phase (radians)', title: 'Phase of r in complex plane (r = Ψ←)'},
    'spin asymmetry': {data: 'sa', xlabel: 'Q (Å⁻¹)', ylabel: '(R++ - R--)/(R++ + R--)', title: 'Asymmetry'}
  },
  sldplot_series_opts: [
    //{label: "SLDₙ x10⁻⁶", id: "sld", color: "DodgerBlue", color1: "DodgerBlue"},
    //{label: "SLDₘ x10⁻⁶", id: "sldm", color: "LightGray", color1: "LightGray"},
    //{label: "θ (π rad)", id: "thetaM", color: "LightGreen", color1: "LightGreen"},
    //{label: "iSLDₙ x10⁻⁶", id: "mu", color: "LightCoral", color1: "LightCoral"},
    {label: "SLDn x10⁻⁶", id: "sld", color: "DodgerBlue", color1: "DodgerBlue"},
    {label: "SLDm x10⁻⁶", id: "sldm", color: "LightGray", color1: "LightGray"},
    {label: "θ (π rad)", id: "thetaM", color: "LightGreen", color1: "LightGreen"},
    {label: "iSLDn x10⁻⁶", id: "mu", color: "LightCoral", color1: "LightCoral"},
  ],
  worker_script: "js/calc_r_mag.js",
  series_lookup: {
      '--': 4, 
      '-+': 5,
      '+-': 6,
      '++': 7
  },
  reflplot_series_opts: [
    {label: "- -", show_points: false, color: "RoyalBlue"},
    {label: "- +", show_points: false, color: "DarkGreen"},
    {label: "+ -", show_points: false, color: "Maroon"},
    {label: "+ +", show_points: false, color: "LightSeaGreen"},
    {label: "data - -", show_points: true, show_line: false, color: "RoyalBlue"},
    {label: "data - +", show_points: true, show_line: false, color: "DarkGreen"},
    {label: "data + -", show_points: true, show_line: false, color: "Maroon"},
    {label: "data + +", show_points: true, show_line: false, color: "LightSeaGreen"}
  ],
  constraints: [
    function(p, d, i) {p[0].thickness = 0},
    function(p, d, i) {p.slice(-1)[0].mu = 0},
    function(p, d, i) {p.slice(-1)[0].thickness = 0},
    function(p, d, i) {p[i].thickness = Math.max(p[i].thickness, 0)}
  ],
  east_size: 550,
  fitting: {
    funcname: "fit_magrefl",
    xs_order: {
      "++": 3, 
      "+-": 2, 
      "-+": 1, 
      "--": 0
    },
    columns: [
      {"label": "thickness", "scale": 10, "minimum": 0},
      {"label": "roughness", "scale": 0.1, "miniumum": 0},
      {"label": "sld", "scale": 0.1},
      {"label": "mu", "scale": 0.1, "minimum": 0}, // no radiation sources allowed in sample!
      {"label": "sldm", "scale": 0.1},
      {"label": "thetaM", "scale": 0.05}
    ],
    extra_params: [
      {"label": "H", "default": 0.0, "step": 0.001, "minimum": null, "scale": 0.01},
      {"label": "AGUIDE", "default": 270, "step": 30, "minimum": null, "scale": 5.0}
    ]
  }
};

var app_init = function(opts) {
  try {
    document.getElementById('remote_tag').value = generateTag();
  }
  catch (err) {
    console.log(err);
  }
      var layout = $('body').layout({
           west__size:          0
        ,  east__size:          opts.east_size
        ,  south__size:         200
          // RESIZE Accordion widget when panes resize
        ,  west__onresize:	    autofit
        ,  east__onresize:	    $.layout.callbacks.resizePaneAccordions
        ,  south__onresize:     $.layout.callbacks.resizePaneAccordions
        ,  center__onresize:    autofit
      });

    var api = {
      methods: {set_data: set_data},
      call: function(message) {
        var method = message.method;
        var args = message.args || [];
        if (method && api.methods.hasOwnProperty(method)) {
          return api.methods[method].apply(null, args);
        }
      },
      init: function() {
        if (window.queued_message) {
          window.api.call(window.queued_message);
        }
        this.active = true;
      }
    }
    var handle_message = function(event) { 
      var message = event.data;
      api.call(event.data);
    }
    window.addEventListener("message", function (event) {
      //alert ('event listner, type of event.data: ' + typeof (event.data) + "\nLength of event.data: " + (event.data.length) + "\nevent.data: " + event.data);
      api.call(event.data)
    }, false);

    var webworker = new Worker(opts.worker_script);
    var webworker_queue = [],
        webworker_busy = false;
    webworker.onerror = function(error) {
      webworker_busy = false;
      alert("worker error: " + error.message + "\n");
    }
    webworker.onmessage = function(event) {
      var message = event.data;
      if (message.ready) {
        if (window.opener && window.opener.postMessage) {
          // get connection_id:
          var href_search = window.location.href.match(/[^\?]*\?.*connection_id=([a-z]+).*/);
          var connection_id = (href_search) ? href_search[1] : "";
          window.opener.postMessage({ready: true, connection_id: connection_id}, "*")
        }
        // replace handler with new one
        webworker.onmessage = workerDataHandler;
        update_plot_live();
      }
    }
    
    
    
    var datafilename = "";
    var sld_plot = null;
    var refl_plot = null;
    var profile_interactor = null;
    var roughness_interactors = null;
    var update_roughnesses = null;
    var export_sld_resolution = 1.0; // Angstroms
    var r = [];
    var sld = [];
    var initial_sld = opts.initial_sld;
    var to_fit = opts.to_fit;
    var current_choice = Object.keys(opts.plot_choices)[0];
    
    function autofit() {
        //console.log("fitting west");
        sld_plot.autofit();
        refl_plot.autofit();
    }
    
    
    function get_limits(sld_array, col_ids) {
      var limits = {};
      function get_column_vals(item) {
        return col_ids.map(function(id) { return item[id] });
      }
      var top_interfaces = sld_array
        .slice(1,-1)
        .map(function(a) { 
          return this.total_thickness += a.thickness }, 
          {total_thickness: 0}
        )
      var interfaces = [0].concat(top_interfaces); // add the bottom interface.
      var lower_limit = Infinity,
          upper_limit = -Infinity;
      interfaces.forEach(function(z, i) {
        var roughness = (sld_array[i] || {roughness: 0}).roughness;
        lower_limit = Math.min(lower_limit, z - 3*roughness);
        upper_limit = Math.max(upper_limit, z + 3*roughness);
      });
      var top_roughness = (sld_array.slice(-2,-1)[0] || {}).roughness || 0;
      var bottom_roughness = (sld_array.slice(0,1)[0] || {}).roughness || 0;
      limits.min_x = lower_limit;
      limits.max_x = upper_limit;
      limits.min_y = sld_array.reduce(function(pre, cur) {
        return Math.min(pre, Math.min.apply(Math, get_column_vals(cur))) }, Infinity);
      limits.max_y = sld_array.reduce(function(pre, cur) {
        return Math.max(pre, Math.max.apply(Math, get_column_vals(cur))) }, -Infinity);
      return limits;
    }
    
    function make_plots( xy1, xy2 ) {
      var sld_plot_opts = {
        show_line: true,
        zoomScroll: true,
        autoscale: false,
        point_size: 10,
        position_cursor: true,
        axes: {
          xaxis: {label: "z (Ångström, from substrate)"}, 
          yaxis: {label: "SLD (10⁻⁶ Å⁻²), θ (π rad)"}
        },
        series: opts.sldplot_series_opts
      }
      
      var col_ids = sld_plot_opts.series.map(function(s) {return s.id});
      jQuery.extend(true, sld_plot_opts, get_limits(initial_sld, col_ids));
      sld_plot = new xyChart.default(sld_plot_opts);
  
      var sld_buttons_div = d3.select("#sldplot").append("div")
        .style("right", "0px")
        .style("bottom", "0px")
        .style("position", "absolute");
        
      sld_buttons_div.append("button")
        .text("export profile")
        .classed("ui-button ui-corner-all", true)
        .on("click", profile_exporter);
        
      sld_buttons_div.append("button")
        .text("export svg")
        .classed("ui-button ui-corner-all", true)
        .on("click", svg_exporter(sld_plot));
        
      var dummy_data = [[]];
      for (var i=0; i<opts.sldplot_series_opts.length; i++) { dummy_data[0].push([]) }
        
      d3.select("#sldplot")
        .data(dummy_data)
        .call(sld_plot);
        
      var profile_opts = { 
        type:'Profile', 
        name:'profile',
        radius: 10,
        series: opts.sldplot_series_opts,
        profile_data: initial_sld,
        show_lines: true
      }
      
      var roughness_opts = opts.sldplot_series_opts.map(function(s,i) {
        return {
          type: "functional",
          name: s.id,
          dx: 2,
          color1: s.color1,
          functional: function(x) { 
            var y = 0, z = 0, layer, l=0, scaled_roughness;
            var cid = s.id;
            if (initial_sld.length > 1) {
              layer = initial_sld[l];              
              scaled_roughness = Math.abs(layer.roughness) * Math.sqrt(2);
              y += layer[cid];
              y -= layer[cid]*0.5*(Module.Math.erf((x - z)/scaled_roughness) + 1);
              for (l=1; l<initial_sld.length-1; l++) {
                // first up:
                layer = initial_sld[l];
                y += layer[cid]*0.5*(Module.Math.erf((x - z)/scaled_roughness) + 1);
                // then down:
                z += layer.thickness;
                scaled_roughness = Math.abs(layer.roughness) * Math.sqrt(2);
                y -= layer[cid]*0.5*(Module.Math.erf((x - z)/scaled_roughness) + 1);
              }
              layer = initial_sld[l];
              y += layer[cid]*0.5*(Module.Math.erf((x - z)/scaled_roughness) + 1);
            }
              
            return y;
          },
          show_lines: true
        }
      });
            
      profile_interactor = new profileInteractor.default(profile_opts);
      roughness_interactors = roughness_opts.map(function(o) {
        var ri = new monotonicFunctionInteractor.default(o); 
        sld_plot.interactors(ri);
        return ri;
      });
      
      update_roughnesses = function() {
        roughness_interactors.forEach(function(r) { r.update(); });
      }
      
      profile_interactor.constraints(opts.constraints);
      sld_plot.interactors(profile_interactor);

      sld_plot.zoomScroll(true);
      
      refl_plot = xyChart.default({
        show_line: true,
        show_points: false,
        show_errorbars: true,
        legend: {show: true},
        point_size: 2,
        axes: {
          xaxis: {label: opts.plot_choices[current_choice].xlabel}, 
          yaxis: {label: opts.plot_choices[current_choice].ylabel}
        },
        series: opts.reflplot_series_opts
      })
              
      var r_buttons_div = d3.select("#rplot").append("div")
        .style("right", "0px")
        .style("bottom", "0px")
        .style("position", "absolute");
        
      r_buttons_div.append("button")
        .text("export calc")
        .classed("ui-button ui-corner-all", true)
        .on("click", calc_exporter);
        
      r_buttons_div.append("button")
        .text("export svg")
        .classed("ui-button ui-corner-all", true)
        .on("click", svg_exporter(refl_plot));
      
      d3.select("#rplot")
        .data([[[[0, 1], [0.2, 1]]]])
        .call(refl_plot);
        
      refl_plot.zoomRect(true);
      refl_plot.ytransform("log");
      
      refl_plot.svg.on("mouseover.setLogLinHandler", function() {
        d3.select("body").on("keydown.toggleLogLin", function() {
          if (d3.event.key.toLowerCase() == "l") {
            var transform_now = refl_plot.ytransform();
            if (transform_now == "log") {
              refl_plot.ytransform("linear");
            } else {
              refl_plot.ytransform("log");
            }
          }
        })
      });
      refl_plot.svg.on("mouseout.setLogLinHandler", function() {
        d3.select("body").on("keydown.toggleLogLin", null)
      })
      
      // start the update loop:
      function process_queue(timestamp) {
        if (!webworker_busy) {
          var message = webworker_queue.pop();
          if (message != null) {
            webworker_busy = true;
            webworker.postMessage(message);
          }
        }
        window.requestAnimationFrame(process_queue);
      }
      
      window.requestAnimationFrame(process_queue);
    };
    
    make_plots();
    
    function svg_exporter(chart) {
      return function() {
        var svg = chart.export_svg();
        d3.select(svg).selectAll("circle.corner").style("r", "0px");
        d3.select(svg).selectAll("path.edge, path.extension").style("visibility", "hidden");
        var serializer = new XMLSerializer();
        var output = serializer.serializeToString(svg);
        var filename = prompt("Save svg as:", "plot.svg");
        if (filename == null) {return} // cancelled
        saveData(output, filename, "image/svg+xml");
      }
    }
    
    function profile_exporter() {
      var sopts = sld_plot.options();
      var sld_array = initial_sld;
      var col_ids = sopts.series.map(function(s) {return s.id});
      var limits = get_limits(sld_array, col_ids);
      var x = d3.range(limits.min_x, limits.max_x, export_sld_resolution);
      
      var output = x.map(function(xx, i) {
        var row = {"z": xx};
        roughness_interactors.forEach(function(r) {
          row[r.state.name] = r.state.functional(xx);
        });
        return row;
      });
      //data, fileName, type
      saveData("#" + d3.tsvFormat(output), "profile.tsv", "text/tab-separated-values");
    }
    
    function calc_exporter() {
      var calc = refl_plot.source_data(),
          sopts = refl_plot.options().series,
          rows = [];
      var numcols = Object.keys(opts.series_lookup).length;
      var colnames = [];
      for (var i=0; i<numcols; i++) {
        colnames[i] = sopts[i].label;
      }
      var header = (["2k_in"].concat(colnames)).join("\t");
      rows[0] = header;
      var datalength = calc[0].length;
      for (var i=0; i<datalength; i++) {
        var yvals = [];
        for (var c=0; c<numcols; c++) {
          yvals[c] = calc[c][i][1];
        }
        rows[i+1] = ([calc[0][i][0]].concat(yvals)).join("\t");
      }
      var output = "#" + rows.join("\n");      
      saveData(output, "reflectivity.tsv", "text/tab-separated-values");
      
    }
  
    function update_profile_limits(sld_array) {
      var col_ids = sld_plot.options().series.map(function(s) {return s.id});
      var limits = get_limits(sld_array, col_ids);
      sld_plot.min_x(limits.min_x).max_x(limits.max_x).min_y(limits.min_y).max_y(limits.max_y);
    }
    
    function filter_meaningless_entries(data) {
      // The "thickness" of the first row of the SLD table is meaningless, since
      // the theory has a semi-infinite medium above and below the "sample", and the
      // first and last rows of the table are used to specify the properties of those 
      // semi-infinite media.
      // 
      // Also, the "roughness" is defined on the top (higher-z) interface for each row, 
      // so it is meaningful for the first row but not the last.
      
      // first row:
      var first_row = data[0] || {};
      (first_row.thickness = new Number(0)).meaningless = true;
      
      // last row: 
      var last_row = data[data.length - 1] || {};
      (last_row.thickness = new Number(0)).meaningless = true;
      (last_row.roughness = new Number(0)).meaningless = true;
    }
    
    function table_draw(data) {
      filter_meaningless_entries(data);
      var target_id = "sld_table";
      var series = opts.sldplot_series_opts;
      var colnames = series.map(function(s) {return s.label});
      var colids = series.map(function(s) {return s.id});
      var colcolors = series.map(function(s) {return s.color1 || "none"});
      colnames.splice(0,0,"thickness (&Aring;)", "roughness<br>(above, &Aring;)");
      colids.splice(0,0,"thickness", "roughness");
      colcolors.splice(0,0,"none","none");
      var target = d3.select("#" + target_id)
      target.selectAll("table").remove();
      var table = target.append("table");
      var thead = table.append("thead");
      var colhead = thead.append("tr")
      colnames.forEach(function(c,i) {
        var id = colids[i],
            bgcolor = colcolors[i];
        colhead.append("th").html(c).attr("id", colids[i]).style("background-color", bgcolor);
      });
      table.append("tbody")
      var sel = target.select("table tbody").selectAll("tr").data(data);
      sel.enter()
        .append("tr")
      target.select("table tbody").selectAll("tr")
        .style("font-family", "inherit")
        .each(function(d,i) {
          var tr = d3.select(this);
          colids.forEach(function(c) {
            var entry = tr.append("td")
              .classed("data-cell", true)
              .classed("meaningless", function(d) { return d[c].meaningless })
              .append("input")
              .classed("data-value", true)
              .attr("data-id", c)
              .attr("type", "text")
              .attr("size", "6")
              .style("background-color", "inherit")
              .style("font-family", "inherit")
              .property("value", d[c].toPrecision(5))
              .on("change", function() {
                d[c] = parseFloat(this.value);
                this.value = parseFloat(this.value).toPrecision(5);
                profile_interactor.update();
                update_profile_limits(data);
                update_roughnesses();
                update_plot_live();
              });
          })
          tr.append("td")
            .append("button")
            .attr("type", "button")
            .text("+after")
            .style("font-family", "inherit")
            .style("border-radius", "5px")
            .on("click", function() {
              var new_row = jQuery.extend(true, {}, d); 
              new_row.thickness = 0;
              data.splice(i+1, 0, new_row); 
              table_draw(data);
              profile_interactor.update();
              update_profile_limits(data);
              update_roughnesses();
              update_plot_live();
            });
          tr.append("td")
            .append("button")
            .attr("type", "button")
            .style("color", "red")
            .text("x")
            .on("click", function() {
              data.splice(i, 1);
              table_draw(data);
              profile_interactor.update();
              update_profile_limits(data);
              update_roughnesses();
              update_plot_live();
            });
        });
        
      update_mode();
    }      
        
    function table_update(data) {
      var target_id = "sld_table";
      var target = d3.select("#" + target_id)
      if (target.select("table tbody").selectAll("tr").size() != data.length) {
        // console.log("need to update table.");
        table_draw(data);
        return
      }
      else {
        target.select("table tbody").selectAll("tr td input.data-value")
          .property("value", function(d) { 
            var data_id = d3.select(this).attr("data-id"); 
            return d[data_id].toPrecision(5); 
          })
      }
    }
    
    
    profile_interactor.dispatch.on("changed.table_update", table_update);
    profile_interactor.dispatch.on("changed.refl_update", update_plot_live);
    profile_interactor.dispatch.on("changed.sld_update", update_profile_limits);
    profile_interactor.dispatch.on("changed.line_update", update_roughnesses);
    table_draw(initial_sld);
    
    layout.sizePane('east', $("div#sld_table table").outerWidth() + 20); // padding is 10 on each side.
    
    function make_plots_switcher(target_id) {
      var choices = Object.keys(opts.plot_choices);
      var switchControls = d3.select("#" + target_id)
        .classed("widget", true).append("div").classed("controlgroup", true);// .append("fieldset");
      //switchControls.append("legend").text("plot choices");
      choices.forEach(function(d, i) {
      //var sel = switchControls.selectAll("label.plot_choices").data(choices);
      //sel.enter().append("label")
        switchControls.append("label")
          .attr("for", "plot_choice_" + d)
          .text(d)
        switchControls.append("input")
          .attr("type", "radio")
          .attr("class", "plot-choice")
          .attr("name", "plot_choice_switcher")
          .attr("id", "plot_choice_" + d )
          .attr("value", d)
          .property("checked", (i==0))
          .on("change", function() {
            if (this.checked) {
              current_choice = this.value;
              var plot_choice = opts.plot_choices[current_choice];
              refl_plot.options().axes.yaxis.label = plot_choice.ylabel;
              update_plot_live();
            }
          })
        });
      //d3.selectAll('input.plot-choice[value="' + current_choice + '"]').property("checked", true);
      
      //update_plot_live();
    }
    
    make_plots_switcher("plots_switcher");
    $(".controlgroup").controlgroup();
    
    function update_plot_live() {
        //var plot_select = $('#choices input:checked').prop('value');
        //var plot_select = opts.plot_choices[current_choice]['data'];
        //var plot_select = 'xy';
        var sld = initial_sld;
        update_plot(sld);
    }
    
    function workerDataHandler(event) {
      var plot_select = opts.plot_choices[current_choice]['data'];
      var series = 0;
      var message = event.data;
      r[series] = message;
      var sd = refl_plot.source_data() || [];
      var new_data = r[series][plot_select];
      Array.prototype.splice.apply(sd, [0, new_data.length].concat(new_data));
      refl_plot.source_data(sd);
      if (plot_select == 'xy') { refl_plot.min_y(Math.max(refl_plot.min_y(), 1e-10)) }
      if (!refl_plot.is_zoomed()) {
        refl_plot.resetzoom();
      }
      refl_plot.update();
      webworker_busy = false;
    }
      
    function update_plot(sld) {
        var qmin = parseFloat(document.getElementById('qmin').value);
        var qmax = parseFloat(document.getElementById('qmax').value);
        var numpoints = parseFloat(document.getElementById('nPts').value);
        var extra_params = {};
        opts.fitting.extra_params.forEach(function(e,i) {
          extra_params[e.label] = parseFloat(document.getElementById(e.label).value);
        });
        var qstep = (qmax - qmin)/numpoints;
        var message = {sld: sld.slice().reverse(), qmin: qmin, qmax: qmax, qstep: qstep};
        $.extend(message, extra_params);
        webworker_queue[0] = message;
    }
  
    function makeQRangeControls(target_id) {
        var qRangeControls = d3.select("#" + target_id).append('div')
          .classed("q-range controls", true)
        
        var control_data = [
          {"label": "qmin", "default": "0.0001", "step": "0.001"},
          {"label": "qmax", "default": "0.1", "step": "0.001"},
          {"label": "nPts", "default": "251", "step": "10"}
        ];
        control_data = control_data.concat(opts.fitting.extra_params);
        qRangeControls.selectAll("label.qcontrols").data(control_data)
          .enter()
          .append("label")
          .classed("qcontrols", true)
          .classed("ui-controlgroup-label", true)
          .attr("id", function(d) {return d.label + "_label"})
          .text(function(d) {return d.label})
          .append("input")
            .attr("type", "text")
            .attr("step", function(d) {return d.step})
            //.classed("ui-spinner-input", true)
            .style("width", "4em")
            .attr("id", function(d) {return d.label})
            .attr("value", function(d) {return d.default})
            .on("change", update_plot_live);
        
        var loglin = qRangeControls.append('div')
          .classed("log-lin-chooser", true);
        loglin
          .append("label")
          .text("y-scale: linear")
          .append("input")
            .attr("type", "radio")
            .property("checked", false)
            .attr("name", "loglin")
            .attr("value", "linear")
            .on("change", update_loglin)
        loglin
          .append("label")
          .text("log")
          .append("input")
            .attr("type", "radio")
            .property("checked", true)
            .attr("name", "loglin")
            .attr("value", "log")
            .on("change", update_loglin)
          
        function update_loglin() {
          refl_plot.ytransform(this.value);
        }
    }
    
    makeQRangeControls('q_controls');
    $("div.log-lin-chooser").controlgroup();
          
    function makeFileControls(target_id) {
      var fileControls = d3.select("#" + target_id).append('div')
          .classed("file-range controls", true)
          .style("position", "relative")
      
      fileControls.append("button")
        .text("export table")
        .on("click", export_table)
      
      var import_button = fileControls.append("button")
        .text("import table")

      var import_fileinput = d3.select("#" + target_id)
        .append("div")
          .style("height", "0px")
          .style("width", "0px")
          .style("overflow", "hidden")
          .append("input")
            .attr("id", "table_import_file")
            .attr("multiple", false)
            .attr("type", "file")
            .on("change", import_table)
      
      // use jQuery event magic:
      import_button.on("click", function() {$(import_fileinput.node()).trigger("click")});
          
    }
    
    makeFileControls('file_controls');
    $("#file_controls").controlgroup();
    
    function makeModeControls(target_id) {
      var modeControls = d3.select("#" + target_id).append('div')
          .classed("mode controls", true)
      
      
      modeControls
        .append("label")
        .text("edit mode")
        .append("input")
          .attr("type", "radio")
          .property("checked", true)
          .attr("name", "mode")
          .attr("value", "edit")
          .on("change", update_mode)
      modeControls
        .append("label")
        .text("fit mode")
        .append("input")
          .attr("type", "radio")
          .property("checked", false)
          .attr("name", "mode")
          .attr("value", "fit")
          .on("change", update_mode)
      
      var fitControls = d3.select("#" + target_id).append('div')
        .classed("fit controls", true)
        .style("padding-top", "5px")
        
      fitControls.append("button")
        .text("start fit")
        .classed("ui-button ui-corner-all ui-widget", true)
        .on("click", fit)
        
      fitControls.append("label")
        .text(" log:")
      
      fitControls.append("div")
        .append("pre")
        .classed("fit log", true)

      update_mode.call({value: "edit"});
      
      $(modeControls.node()).controlgroup();
    }
    
    function update_mode() {
      var modechoice = d3.select("div.mode.controls input:checked");
      if (modechoice.empty()) {
        // probably no mode controls built yet;
        return;
      } 
      var mode = modechoice.attr("value");
      d3.select("div.fit.controls").style("visibility", (mode == "edit") ? "hidden" : "visible");
      document.getElementById('btnRemoteFit').disabled = (mode == 'edit');
      var data_table = d3.select("div#sld_table");
      data_table.selectAll("td.data-cell")
        .classed("edit-mode", (mode == "edit"))
        .classed("fit-mode",  (mode == "fit"));
      data_table.selectAll("div#sld_table input.data-value")
        .attr("readonly", (mode == "fit") ? "readonly" : null);
        
      if (mode == "fit") {
        data_table.selectAll("td.data-cell").on("click.select", function() {
          var target = d3.select(this);
          target.classed("selected", (!target.classed("selected")));
        })
      }
      else { // "edit mode"
        data_table.selectAll("td.data-cell").on("click.select", null);
      }
    }
    
    makeModeControls('fit_controls');
    //update_plot_live();
    
    //update_plot(0, initial_sld, 'xy');
    
    function set_data(raw_data) {
      data_file_content = raw_data;
      var series_lookup = opts.series_lookup;
        var x, y, y_out, row;
        var kz_list = [], 
            R_list = [], 
            dR_list = [];
        var xmax = -Infinity,
            xmin = Infinity;
        var sd = refl_plot.source_data() || [];
        // fill in missing series with empty array:
        for (var xs in series_lookup) {
          var series_num = series_lookup[xs];
          sd[series_num] = [];
        }
        var sections = raw_data.split(/\r\n\r\n|\r\r|\n\n/g);
        for (var s=0; s<sections.length; s++) {
            var lines = sections[s].split(/\r\n|\r|\n/g);
            var output_data = [];
            var metadata = {};
            //var lines = raw_data.split('\n');
            for (var i in lines) {
                row = lines[i];
                if (row[0] == '#') {
                  try { $.extend(true, metadata, JSON.parse('{' + row.replace(/[#]+/, '') + '}')) }
                  catch (e) {}
                }
                else {
                  var xs_num = opts.fitting.xs_order[metadata.polarization] || 0;
                  var rowdata = row.split(/[\s,]+/)
                  //row.split(' ');
                  if (rowdata.length >= 2) {
                      x = Number(rowdata[0]);
                      kz_list.push([x/2.0, xs_num]);
                      xmax = Math.max(xmax, x);
                      xmin = Math.min(xmin, x);
                      y = Number(rowdata[1]);
                      R_list.push(y);
                      if (rowdata.length > 2) {
                        var dy = Number(rowdata[2]);
                        dR_list.push(dy);
                        var yerr = {
                          xupper: x,
                          xlower: x, 
                          yupper: y + dy,
                          ylower: y - dy
                        } 
                        output_data.push([x, y, yerr]);
                      } else {
                        dR_list.push(1);
                        output_data.push([x, y]);
                      }
                  }
                }
            }
            var series_num = series_lookup[metadata.polarization];
            series_num = (series_num == null) ? Object.keys(series_lookup).length : series_num;
            sd[series_num] = output_data;
            
        }
        
        app_options.data = {kz_list: kz_list, R_list: R_list, dR_list: dR_list};
        $("input#qmin").val(xmin);
        $("input#qmax").val(xmax);
        refl_plot.source_data(sd);
        update_plot_live();
    }

    function loadData() {
      var file = document.getElementById('datafile').files[0]; // only one file allowed
      try {
        datafilename = file.name;
        setScriptFileName (datafilename);
        var reader = new FileReader();
        reader.onload = function(e) {
            set_data(this.result);
        }
        reader.readAsText(file);
      }
      catch (err) {
        console.log(err);
      }    }

      function setScriptFileName (datafilename) {
        var scriptName = '';
        var pt = datafilename.indexOf('.');
        if (pt > 0) {
          scriptName = datafilename.substring(0, pt) + '.zip';
        }
        var inText = document.getElementById('scriptname');
        inText.value = scriptName;
        //var tmpText = document.getElementById('input_file_name');
        //tmpText.textContent = scriptName;
      }    var fileinput = document.getElementById('datafile');

      fileinput.onchange = loadData;    
    
    var test_show_script = function() {
        var sldarray = get_sld(plot2.plugins.interactors.profile1);
        //var datafilename = datafilename || "";
        var pyscript = generate_slab_script(sldarray, datafilename);
        var data_uri = "data:application/octet-stream,"+encodeURIComponent(pyscript);
        var a = document.getElementById('pyscript_data_uri');
        a.href = data_uri;
        a.download = "refl_script.py";
        a.mimeType = 'application/binary-octal';
        a.click();     
    }    
    
    var saveData = (function () {
        var a = d3.select("body").append("a")
          .style("display", "none")
          .attr("id", "savedata")
        return function (data, fileName, type) {
            var type = type || "application/python";
            var blob = new Blob([data], {type: type}),
                url = window.URL.createObjectURL(blob);
            if (window.navigator.msSaveOrOpenBlob) { 
              window.navigator.msSaveOrOpenBlob(blob, fileName); 
            } else {
              a.attr("href", url)
               .attr("download", fileName)
               .node().click();
              setTimeout(function() { window.URL.revokeObjectURL(url) }, 1000);
            }
        };
    }());
    
    function show_script() {
      export_script('zip');
    }

    function send_script () {
      setRemoteID ('');
      export_script('websocket');
      save_tag_to_local(uploadTag());
      timerRemoteStatus = setInterval (readRemoteStatus, 500);
    }

    function onRemoteStatus() {
      stopStatusTimer();
      var message = composeRefl1dStatusMessage();
      if (message == null) {
        alert("can't send status");
      }
      else {
          setRemoteStatus ('');
          openWSConnection(webSocketURL, JSON.stringify(message));
      }
    }

    function onRemoteTable () {
      var id = uploadRemoteID();
      var remote_message = composeRefl1dFitResults(id);
      try {
        openWSConnection(webSocketURL, JSON.stringify(remote_message));
      }
      catch (err) {
        console.log(err);
      }
}

var readCounter = 0;
var fReadRemoteStatusBusy = false;

    function readRemoteStatus() {
      if (!fReadRemoteStatusBusy) {
        var message = composeRefl1dStatusMessage();
        if (message) {
          fReadRemoteStatusBusy = true;
          try {
            openWSConnection(webSocketURL, JSON.stringify(message));
          }
          catch (err) {
            console.log(err);
          }
          finally {
            fReadRemoteStatusBusy = false;
          }
        }
      }
      console.log('reading status');
/*
      readCounter++;
      if (readCounter > 10) {
        clearInterval (timerRemoteStatus);
        timerRemoteStatus = null;
        readCounter = 0;
      }
*/
    }

    function export_script(export_dest) {
        var sldarray = initial_sld.map(function(d) {var dd = $.extend(true, {}, d); dd.sld *= 1e-6; dd.mu *= 1e-6; dd.sldm *= 1e-6; return dd});
        var qmin = parseFloat($("input#qmin").val()),
            qmax = parseFloat($("input#qmax").val()),
            nPts = parseInt($("input#nPts").val());
        var extra_params = opts.fitting.extra_params.map(function(e,i) { 
          var input = d3.select("input#" + e.label);
          return (input.empty()) ? 0 : +(input.node().value);
        });
        // have to specify the probe in terms of theta rather than Q for refl1d...
        // we'll use a fake wavelength of 5.0 Angstroms.
        var L = 5.0,
            k0z = 2*Math.PI/L,
            tmin = (180.0/Math.PI) * Math.asin(qmin/(2.0 * k0z)),
            tmax = (180.0/Math.PI) * Math.asin(qmax/(2.0 * k0z));
        // sldarray order is based on the old reflpak ordering (beam source side first)
        // while refl1d builds the slab model from the "bottom", with the substrate slab first
        var script_params = [sldarray, datafilename, tmin, tmax, nPts, L].concat(extra_params);
        try {
          var pyscript = generate_slab_script.apply(null, script_params);
          var filename = document.getElementById("scriptname").value;
          var lstr_py = pyscript.trim().split('\n');
          var strToFit = get_string_to_fit (get_to_fit());
          var strScript = modifySelection(lstr_py, strToFit);
          var write_file = false;
          //if (write_file)
            //saveData(strScript, filename);
          if (export_dest == 'zip') {
            save_data_files (strScript, filename, datafilename);
          }
          else if (export_dest == 'websocket') {
            send_data_files (strScript, filename, datafilename);
          }
        }
        catch (err) {
          alert(err.message);
        }
    }

    function set_param_min_max (v0, min_val, max_val, param_values) {
      param_values['value'] = v0;
      param_values['min'] = min_val;
      param_values['max'] = max_val;
    }

    function get_param_min(param_name, v0, param_values) {
      if (param_name == "thickness") {
        set_param_min_max (v0, v0 - 1, v0 + 1, param_values);
      }
      else if (param_name == "sld") {
        set_param_min_max (v0, v0 - 2, v0 + 2, param_values);
      }
      else if (param_name == "mu") {
        set_param_min_max (v0, v0 - 1, v0 + 1, param_values);
      }
      else if (param_name == "roughness") {
        set_param_min_max (v0, v0 - 2, v0 + 2, param_values);
      }
    }

    function set_fit_dest(param_name, to_fit_layer, param_values) {
      var n, keys = Object.keys(param_values), f_stop;

      f_stop = false;
      if (to_fit_layer.hasOwnProperty('length')) {
        for (n=0 ; (n < to_fit_layer.length) && (!f_stop) ; n++) {
          if (param_name == to_fit_layer[n])
            f_stop = true;
        }
      }
      param_values['fit_dest'] = String(f_stop);
    }

/*
output file format
array of layers.
each layer a dictionary with the following keys:
  value:    real/Inf/-Inf
  min:      real/Inf/-Inf
  max:      real/Inf/-Inf
  fit_dest: true/false
*/
function get_JSON() {
      var json_table, table_data = get_table_data();
      var json_table, layer_key, json_layer, layer_keys, layer_values, table_layer;
      var to_fit = get_to_fit();

      try {
        json_table = {};
        for (var n_table in table_data) {
          table_layer = table_data[n_table];
          layer_key = "layer" + n_table;
          json_layer={};
          layer_keys = Object.keys(table_layer);
          layer_values = Object.values(table_layer);
          for (var n=0 ; n < layer_keys.length ; n++) {
            var param_name = layer_keys[n], param_values;
            param_values = {};
            get_param_min(param_name, Number(layer_values[n]), param_values);
            set_fit_dest(param_name, to_fit[n_table], param_values);
            json_layer[param_name] = param_values;
          }
          json_table[layer_key] = json_layer;
        }
      }
      catch (err) {
        alert(err.message);
      }
      return (json_table);
  }

/*
  function get_json_data_name (script_filename) {
    var arr_json_data_name = [];
    var json_file_data= {};

    json_file_data['name'] = script_filename.replace('py','json');
    json_file_data['data'] = get_JSON();
    //arr_json_data_name[0] = get_JSON();
    //arr_json_data_name[1] = script_filename.replace('py','json');
    //return (arr_json_data_name);
    return (json_file_data);
  }
*/

  function add_json_file (zip, script_filename) {
    var json_file_name, json_data;

    json_data = get_JSON();
    json_file_name = script_filename.replace('py','json');
    zip.file (json_file_name, JSON.stringify(json_data));
  }

  function save_data_files (strScript, script_filename, data_file_name) {
    var data_file_name, zip_file_name, json_file_name, json_data;
    var base_name = data_file_name.split('.').slice(0, -1).join('.');
    script_filename = get_script_file_name (base_name);
    zip_file_name   = get_zip_file_name (base_name);
    try {
      var zip = new JSZip();
      zip.file(script_filename, strScript);
      if (data_file_content) {
        zip.file(data_file_name, data_file_content);
      }
      add_json_file (zip, script_filename);
      zip.generateAsync({type:"blob"})
        .then(function(content) {
          saveAs(content, zip_file_name);
        });
      }
      catch (err) {
        alert (err.message);
      }
    }

    function send_data_files (strScript, script_filename, data_file_name) {
      var zip_file_name, jsnJson, jsnScript, jsnData, msg_data = {};
      var base_name = data_file_name.split('.').slice(0, -1).join('.');
      script_filename = get_script_file_name (base_name);
      zip_file_name   = get_zip_file_name (base_name);
      
      jsnJson   = make_json_name_data (script_filename.replace('py','json'), get_JSON());
      jsnScript = make_json_name_data (script_filename, strScript);
      jsnData   = make_json_name_data (data_file_name, data_file_content);
      msg_data['zip']    = zip_file_name;
      msg_data['json']   = jsnJson;
      msg_data['script'] = jsnScript;
      msg_data['data']   = jsnData;
      try {
        var message = composeRefl1dFitMessage(JSON.stringify(msg_data));
        openWSConnection(webSocketURL, JSON.stringify(message));
      }
      catch (err) {
        alert (err.message);
      }
    }

    function message_to_json(wsMsg) {
      var p = wsMsg.indexOf("'");
      while (p >= 0) {
        wsMsg = wsMsg.replace("'", '"');
        p = wsMsg.indexOf("'");
      }
      return (wsMsg);
    }

    /**
 * Open a new WebSocket connection using the given parameters
 */
    //function openWSConnection(protocol, hostname, port, endpoint) {
    function openWSConnection(webSocketURL, msgData) {
      console.log("openWSConnection::Connecting to: " + webSocketURL);
      try {
      webSocket = new WebSocket(webSocketURL);
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
        console.log(msg);
      };
      webSocket.onmessage = function (messageEvent) {
        HandleWSReply (messageEvent.data);
        //var wsMsg = messageEvent.data;
        //display_remote_id(wsMsg)
        console.log("WebSocket MESSAGE: " + messageEvent.data);
        webSocket.close();
      };
    } catch (exception) {
      console.error(exception);
    }
  }

  function HandleWSReply (wsMsg) {
    try {
      //var txt = message_to_json(wsMsg);
      //var j = JSON.parse(txt);
      var wjMsg = JSON.parse(message_to_json(wsMsg));

      if (wjMsg.command == ServerCommands.START_FIT) {
        display_remote_id(wjMsg);
      }
      else if (wjMsg.command == ServerCommands.GET_STATUS) {
        HandleStatusReply(wjMsg);
      }
      else if (wjMsg.command == ServerCommands.GET_REFL1D_RESULTS) {
        HandleRefl1dRessults(wjMsg);
      }
    }
    catch (err) {
      console.log(err);
      alert (wsMsg);
    }
  }

  function display_remote_id(wjMsg) {
    var p = wjMsg.params;
    var keys = [];
    for (var k in p) keys.push(k);
    var remote_id = p[keys[0]];
    setRemoteID (remote_id);
  }

  function setRemoteID (remote_id) {
    document.getElementById("inRemoteID").value = remote_id;
  }
  
  function setRemoteStatus (job_status) {
    document.getElementById('spanRemoteStatus').innerText = job_status;
  }
  
  function getRemoteStatus () {
    return (document.getElementById('spanRemoteStatus').innerText);
  }

  function HandleStatusReply(wjMsg) {
    console.log(wjMsg);
    if (wjMsg.params.length >= 0) {
      var guiID = uploadRemoteID(), remoteID = wjMsg.params[0].job_id;
      if ((Number(guiID) > 0) && (Number(guiID) == remoteID)) {
        var remote_job_status = wjMsg.params[wjMsg.params.length - 1].job_status.toLowerCase();
        setRemoteStatus (remote_job_status);
        if (remote_job_status == 'completed') {
//          document.getElementById('btnRemoteTbl').disabled = false;
          stopStatusTimer();
          //sendForJsonResuls(uploadRemoteID());
        }
      }
    }
  }

  function getLayerAsText (layer) {
    var txt;
    txt = layer.thickness.value.toString() + '\t' + 
          layer.interface.value.toString() + '\t' + 
          layer.rho.value.toString() + '\t' + 
          layer.irho.value.toString();
    return (txt);
  }

  function HandleRefl1dRessults(wjMsg) {
    var hexJson = wjMsg.params.json_data;
    var n, strBuf = '', strJson, jsonRes, out="";
    var tblResults = ['thickness'	+ '\t' + 'sld'	+ '\t' + 'mu'	+ '\t' + 'roughness'];

    for (n = 0 ; n < hexJson.length ; n += 2) {
      var hVal = (parseInt(hexJson[n], 16)  * 0x10) + parseInt (hexJson[n + 1], 16);
      strBuf += String.fromCharCode(hVal);
    }
    strJson = strBuf.replace(/Infinity/g,'1e308');
    jsonRes = JSON.parse(strJson);
    var layers = jsonRes.sample.layers;
    for (n=0 ; n < layers.length ; n++) {
      var txtLayer = getLayerAsText (layers[n]);
      tblResults[n + 1] = txtLayer;
    }
    var strResults = tblResults.join('\n');
    update_from_imported_table (strResults);
    var txt = show_fit_alphanumeric_output(out, 88.381, 17);
    d3.select("pre.fit.log").text(txt);

  }

  function sendForJsonResuls(remoteID) {
    alert ('Sending for results for ID ' + remoteID);
    //document.getElementById('btnRemoteTbl').disabled = false;
  }

  function stopStatusTimer() {
    if (timerRemoteStatus) {
      clearInterval (timerRemoteStatus);
      timerRemoteStatus = null;
    }
  }

  function make_json_name_data(name, data) {
      var jsn = {};

      jsn['name'] = name;
      jsn['data'] = data;
      return(jsn);
    }

    function get_script_file_name (script_filename) {
      if ((script_filename == null) || (script_filename.trim().length == 0)) {
        script_filename = "script";
      }
      var ext = script_filename.substring (script_filename.length - 3).toLowerCase();
      if (ext != ".py") {
        script_filename += ".py";
      }
      return (script_filename);
    }

    function get_zip_file_name (script_filename) {
      var zip_file_name, script_in = document.getElementById('scriptname');
      if (script_in) {
        zip_file_name = script_in.value.toLowerCase();
      }
      if (zip_file_name.length == 0) {
        if ((script_filename) && (script_filename.length > 0)) {
          zip_file_name = script_filename.toLowerCase();
        }
        if (zip_file_name.length == 0) {
          zip_file_name = "script";
        }
        else {

        }
      }
      if (zip_file_name.indexOf('.py') > 0) {
        zip_file_name = zip_file_name.replace (/py/,'zip');
      }
      var ext = zip_file_name.substring(zip_file_name.length - 4);
      if (ext != ".zip") {
        zip_file_name += ".zip";
      }
      return (zip_file_name);
    }

    function get_data_file_name () {
      var data_file_name;

      try {
        data_file_name = document.getElementById('datafile').files[0].name;
      }
      catch (err) {
        if ((data_file_content != null) &&(data_file_content.length > 0))
          data_file_name = "data.dat";
        else
          data_file_name = null;
      }
      return (data_file_name);
    }

    function get_string_to_fit (to_fit) {
      var strToFit = "";
      for (var n=0 ; n < to_fit.length ; n++) {
        strToFit += JSON.stringify(to_fit[n]);
        if (n < to_fit.length - 1) {
          strToFit += "\n";
        }
      }
      return (strToFit);
    }

    function modifySelection(lstr_py, strToFit) {
      var dictFitToScript = {"thickness":"thickness", "roughness":"interface", "sld":"rho", "mu":"irho"};
      var lstrToFit = [];
      var fit_params = get_fit_params(strToFit);
      lstrToFit = get_fit_string (fit_params, dictFitToScript);
      lstr_py = comment_out_selected_params (lstr_py, lstrToFit);
      return (lstr_py.join('\n'));
    }

    function comment_out_selected_params (lstr_py, lstrToFit) {
      for (var n=0 ; n < lstr_py.length ; n++) {
        var strLine = lstr_py[n];
        var found = false;
        for (var i=0 ; (i < lstrToFit.length) && (!found) ; i++) {
          if (strLine.includes(lstrToFit[i])) {
            found = true;
          }
        }
        if (found) {
          lstr_py[n] = "# " + strLine;
        }
      }
      return (lstr_py);
    }

    function get_fit_string (fit_params, dictFitToScript) {
      var lstrToFit = [];
      for (var n=0 ; n < fit_params.length ; n++) {
        for (var i=0 ; i < fit_params[i].length ; i++) {
          var strParam = n.toString() + "." + dictFitToScript[fit_params[n][i]] + ".range";
          lstrToFit.push(strParam);
        }
      }
      return (lstrToFit);
    }

    function get_fit_params(strToFit) {
      var lstr = strToFit.trim().split('\n');
      var strTmp, strLayer, fit_params=[];

      for (var n=0 ; n < lstr.length ; n++) {
        strTmp = lstr[n].split(',');
        strLayer = [];
        for (var i=0 ; i < strTmp.length ; i++) {
          strLayer.push(strTmp[i].split(':')[0].replace(/\"/g,'').replace(/{/g,'').replace(/}/g,'').trim());
        }
        fit_params.push(strLayer);
      }
      return (fit_params);
    }

    document.getElementById("scriptbutton").onclick = show_script;
    document.getElementById("btnRemoteFit").onclick = send_script;
    document.getElementById("btnRemoteStatus").onclick = onRemoteStatus;
    document.getElementById("btnRemoteTbl").onclick = onRemoteTable;

    function get_table_data () {
      var table_data = d3.selectAll("#sld_table table tr").data().slice(1);
      return (table_data);
    }

    function export_table() {
      // skip the header...
      //var table_data = d3.selectAll("#sld_table table tr").data().slice(1);
      var table_data = get_table_data();
      saveData(d3.tsvFormat(table_data), "sld_table.txt");
    }

    function import_table() {
      var file_input = document.getElementById('table_import_file')
      var file = file_input.files[0]; // only one file allowed
      var result = null;
      file_input.value = "";
      var reader = new FileReader();
      reader.onload = function(e) {
        update_from_imported_table (this.result);
      }
      reader.readAsText(file);
    }
    
    function update_from_imported_table (result) {
      //var new_sld = d3.tsvParse(this.result);
      var new_sld = d3.tsvParse(result);
      new_sld.forEach(function(d) {
        for (var key in d) {
          if (d.hasOwnProperty(key)) {
            // convert everything to numbers.
            d[key] = +d[key];
          }
        }
      });
      initial_sld.splice(0, initial_sld.length + 1);
      $.extend(true, initial_sld, new_sld);
      table_draw(initial_sld);
      update_profile_limits(initial_sld);
      profile_interactor.update();
      sld_plot.resetzoom();
      update_plot_live();
  }

    function get_to_fit() {
      var to_fit = [];
      var data_table = d3.select("div#sld_table table tbody");
      data_table.selectAll("tr").each(function(layer, l) {
        var layer_fit = {};
        d3.select(this).selectAll("td.selected input").each(function(cell) {
          var data_id = d3.select(this).attr("data-id");
          layer_fit[data_id] = true;
        })
        to_fit.push(layer_fit);
      })
      return to_fit;
    }
    
    function sld_to_params(extra_param_values, to_fit) {
      var extra_param_values = extra_param_values || [];
      var sld = initial_sld.slice().reverse();
      //var tf = get_to_fit().reverse();
      //var tf = to_fit.slice().reverse();
      var layers = sld.length;
      var c = [];
      var s = [];
      var bndu = [];
      var bndl = [];
      
      var columns = opts.fitting.columns;
      var extra_params = opts.fitting.extra_params;
      //var scales = opts.fitting.scales.concat(extra_params.map(function(e,i) {return e.scale}));
      
      columns.forEach(function(col, ci) {
          c = c.concat(sld.map(function(l) {return +l[col.label]}));
          s = s.concat(sld.map(function(l) {return +col.scale}));
          bndl = bndl.concat(sld.map(function(l,i) {
            var limit = l[col.label];
            if (to_fit[i] && to_fit[i][col.label]) {
              limit = (col.minimum == null) ? -Infinity : col.minimum;
            }
            return +limit;
          }));
          bndu = bndu.concat(sld.map(function(l,i) {
            var limit = l[col.label];
            if (to_fit[i] && to_fit[i][col.label]) {
              limit = (col.maximum == null) ? +Infinity : col.minimum;
            }
            return +limit;
          }));
      })
      
      c = c.concat(extra_param_values);
      s = s.concat(extra_params.map(function(e,i) {return e.scale}));
      bndl = bndl.concat(extra_param_values); // don't fit for now
      bndu = bndu.concat(extra_param_values);
      
      console.log({c: c, s: s, bndl: bndl, bndu: bndu});
      return {c: c, s: s, bndl: bndl, bndu: bndu, layers: layers}
    }
    
    function params_to_sld(params) {
      var layers = initial_sld.length;
      var c = params.c;
      var sld = initial_sld.slice().reverse();
      var columns = opts.fitting.columns;
      var ptr = 0;
      columns.forEach(function(col, ci) {
        sld.forEach(function(l, i) {
          l[col.label] = c[ptr++];
        })
      });
      var extra_params = {};
      opts.fitting.extra_params.forEach(function(p) { extra_params[p.label] = c[ptr++]; })
      return {sld: sld.reverse(), extra_params: extra_params}
    }
    
    function fit_report(params, to_fit) {
      var columns = opts.fitting.columns;
      var sld = initial_sld.slice().reverse();
      var L = sld.length;
      //var tf = to_fit.slice().reverse();
      var output = "";
      var ptr = 0;
      columns.forEach(function(col, ci) {
        sld.forEach(function(l, i) {
          if (to_fit[i] && to_fit[i][col.label]) {
            output += col.label + "_" + (L-i) + " =\t" + params.c[ptr].toPrecision(6) + " +/- " + params.c_err[ptr].toPrecision(6) + "\n";
          }
          ptr++;
        })
      });
      output += show_fit_alphanumeric_output(output, params.wrmserror.toPrecision(6), params.iterations.toFixed());
      return output;
    }

    function show_fit_alphanumeric_output(output, chi_square, iterations) {
      output += "\n";
      output += "reduced chi-squared = \t" + chi_square + "\n";
      output += "iterations = \t" + iterations + "\n";
      return (output);
    }

    function fit() {
      var extra_params = opts.fitting.extra_params.map(function(e,i) { 
        var input = d3.select("input#" + e.label);
        return (input.empty()) ? 0 : +(input.node().value);
      });
      //var H = 0; // for now
      //var AGUIDE = +d3.select("input#AGUIDE").node().value;
      var to_fit = get_to_fit().reverse();
      var params = sld_to_params(extra_params, to_fit);
      var xs = JSON.stringify(opts.data.kz_list); // qz to kz
      var ys = JSON.stringify(opts.data.R_list);
      var ws = JSON.stringify(opts.data.dR_list.map(function(dy) {return 1.0/dy}));
      var cs = JSON.stringify(params.c);
      var ss = JSON.stringify(params.s);
      
      var lower_bound = JSON.stringify(params.bndl).replace(/null/g, "-Inf");
      var upper_bound = JSON.stringify(params.bndu).replace(/null/g, "+Inf");
      console.log({xs: xs, ys: ys, ws: ws, cs: cs, ss: ss, upp: upper_bound, low: lower_bound});
      var fit_func = opts.fit_func
      var str_result = Module[opts.fitting.funcname].call(null, xs, ys, ws, cs, ss, lower_bound, upper_bound);
      var result = JSON.parse(str_result);
      
      var new_sld = params_to_sld(result);
      //initial_sld.splice(0, initial_sld.length + 1);
      $.extend(true, initial_sld, new_sld.sld);
      //d3.selectAll("div#sld_table table tbody tr").data(initial_sld);
      show_results (initial_sld);

      var txt = fit_report(result, to_fit);
      d3.select("pre.fit.log").text(txt);
    }

    function show_results (initial_sld) {
      table_update(initial_sld);
      update_profile_limits(initial_sld);
      profile_interactor.update();
      sld_plot.resetzoom();
      update_plot_live();
    }
    
    var current_item = d3.selectAll('input.plot-choice[value="' + current_choice + '"]');
    current_item.property("checked", true);
    //current_item.on("change").call(current_item.node());
    
    $.get("doc/calcR.html", function(data) { $("div#documentation_popup").html(data); });
    $("button#show_doc").on("click", function() { $("div#documentation_popup").dialog({
        modal: true,
        autoOpen: true,
        title: "NCNR online reflectivity calculators",
        buttons: {
          Ok: function() {
            $( this ).dialog( "close" );
          }
        }
      });
    });
}
