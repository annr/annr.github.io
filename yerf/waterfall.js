/**
 * Yammer Performance (Yerf) Visualization
 * Two cannibalized scripts for showing Timing API data. Kind of a mess.
 */

function __Profiler() {
  this.totalTime = 0;

  this.barHeight = 18;
  this.timeLabelWidth = 50;
  this.nameLabelWidth = 160;
  this.textSpace = this.timeLabelWidth + this.nameLabelWidth;
  this.spacing = 1.2;
  this.unit = 1;
  this.fontStyle = "11.5px Arial";
  this.containerPadding = 20;

  this.container = null;
  this.customElement = false;

  this.timingData = [];
  this.resourceData = [];
  this.sections = [];

  this.xmlns = "http://www.w3.org/2000/svg";

  this.barColors = {
    blocked: "204, 204, 204",
    thirdParty: "0, 0, 0",
    redirect: "255, 221, 0",
    appCache: "161, 103, 38",
    dns: "48, 150, 158",
    tcp: "255, 157, 66",
    ssl: "213,102, 223",
    request: "64, 255, 64",
    response: "52, 150, 255"
  };
};

/**
 * The order of the events is important,
 * store it here.
 */
__Profiler.prototype.eventsOrder = ['navigationStart', 'redirectStart', 'redirectStart', 'redirectEnd', 'fetchStart', 'domainLookupStart', 'domainLookupEnd', 'connectStart', 'secureConnectionStart', 'connectEnd', 'requestStart', 'responseStart', 'responseEnd', 'unloadEventStart', 'unloadEventEnd', 'domLoading', 'domInteractive', 'msFirstPaint', 'domContentLoadedEventStart', 'domContentLoadedEventEnd', 'domContentLoaded', 'domComplete', 'loadEventStart', 'loadEventEnd'];

/**
 * CSS strings for various parts of the chart
 */
__Profiler.prototype.cssReset = 'font-size:12px;line-height:1em;z-index:99999;text-align:left;' + 'font-family:Calibri,\'Lucida Grande\',Arial,sans-serif;text-shadow:none;box-' + 'shadow:none;display:inline-block;color:#444;font-' + 'weight:normal;border:none;margin:0;padding:0;background:none;';

__Profiler.prototype.elementCss = 'position:fixed;margin:0 auto;top:' + '0;left:0;right:0;border-bottom:solid 1px #EFCEA1;box-shadow:0 2px 5px rgba(0,0,0,.1);';

__Profiler.prototype.containerCss = 'background:#FFFDF2;background:rgba(255,253,242,.99);padding:20px;display:block;';

__Profiler.prototype.headerCss = 'font-size:24px;font-weight:normal;width:auto';

__Profiler.prototype.sectionHeaderCss = 'font-size:16px;font-weight:normal;margin:1em 0 0 0;width:auto';

__Profiler.prototype.buttonCss = 'float:right;background:none;border-radius:5px;padding:3px 10px' + ';font-size:16px;line-height:130%;width:auto;margin:-7px -10px 0 0;cursor:pointer';

__Profiler.prototype.toggleCss = 'color:#1D85B8;font-size:12px;line-height:130%;width:auto;margin-left:9px;cursor:pointer';

/**
 * Retrieves performance object keys.
 * Helper function to cover browser
 * inconsistencies.
 *
 * @param {PerformanceTiming} Object holding time data
 * @return {Array} list of PerformanceTiming properties names
 */
__Profiler.prototype._getPerfObjKeys = function(obj) {
  var keys = Object.keys(obj);
  return keys.length ? keys : Object.keys(Object.getPrototypeOf(obj));
}

/**
 * Sets unit used in measurements on canvas.
 * Depends on the lenght of text labels and total
 * time of the page loading.
 */
__Profiler.prototype._setUnit = function(canvas) {
  this.unit = (canvas.width - this.textSpace) / this.totalTime;
}

/**
 * Defines sections of the chart.
 * According to specs there are three:
 * network, server and browser.
 *
 * @return {Array} chart sections.
 */
__Profiler.prototype._getSections = function() {
  return Array.prototype.indexOf ? [{
    name: 'network',
    color: [224, 84, 63],
    firstEventIndex: this.eventsOrder.indexOf('navigationStart'),
    lastEventIndex: this.eventsOrder.indexOf('connectEnd'),
    startTime: 0,
    endTime: 0
  }, {
    name: 'server',
    color: [255, 188, 0],
    firstEventIndex: this.eventsOrder.indexOf('requestStart'),
    lastEventIndex: this.eventsOrder.indexOf('responseEnd'),
    startTime: 0,
    endTime: 0
  }, {
    name: 'browser',
    color: [16, 173, 171],
    firstEventIndex: this.eventsOrder.indexOf('unloadEventStart'),
    lastEventIndex: this.eventsOrder.indexOf('loadEventEnd'),
    startTime: 0,
    endTime: 0
  }] : [];
}

/**
 * Creates main container
 * @return {HTMLElement} container element
 */
__Profiler.prototype._createContainer = function() {
  var container = document.createElement('div');
  var header = this._createHeader();
  var button = this._createCloseButton();

  button.onclick = function(e) {
    button.onclick = null;
    container.parentNode.removeChild(container);
  }; // DOM level 0 used to avoid implementing this twice for IE & the rest
  container.style.cssText = this.cssReset + this.containerCss;

  if (!this.customElement) {
    container.style.cssText += this.elementCss;
  }

  header.appendChild(button);
  container.appendChild(header);
  return container;
}

/**
 * Creates header
 * @return {HTMLElement} header element
 */
__Profiler.prototype._createSectionHeader = function(className, headingString) {
  var c = document.createElement('div');
  c.classList.add('performanceTiming' + 'Header');
  var h = document.createElement('p');

  var sectionToggle = this._createSectionToggle(className);
  
  h.innerHTML = headingString;

  h.style.cssText = this.cssReset + this.sectionHeaderCss;

  c.appendChild(h);
  c.appendChild(sectionToggle);

  return c;
}

/**
 * Creates subheader
 * @return {HTMLElement} header element
 */
__Profiler.prototype._createResourceSectionSubHeader = function() {
  var sh = document.createElement('p');
  var sectionStr = '';

  for (var prop in this.barColors) {
    sectionStr += '<span style="color:rgb(' + this.barColors[prop] + ')">' + prop + '</span> / ';
  }

  sectionStr = sectionStr.substring(0,sectionStr.length-2);
  sh.innerHTML += sectionStr + '&nbsp;';
  return sh;
}

/**
 * Creates subheader
 * @return {HTMLElement} header element
 */
__Profiler.prototype._createNavigationSectionSubHeader = function() {
  var sh = document.createElement('p');
  var sectionStr = '';

  for (var i = 0, l = this.sections.length; i < l; i++) {
    sectionStr += '<span style="color:rgb(' + this.sections[i].color.join(',') + ')">' + this.sections[i].name + '</span> / ';
  }

  sectionStr = sectionStr.substring(0,sectionStr.length-2);
  sh.innerHTML += sectionStr + '&nbsp;';
  return sh;
}

__Profiler.prototype._createHeader = function() {
  var c = document.createElement('div');
  var h = document.createElement('h1');

  h.innerHTML = 'Yammer Performance (<a href="https://www.yammer.com/microsoft.com/#/threads/inGroup?type=in_group&feedId=4743841" target="_blank">Yerf</a>) Visualization';
  h.style.cssText = this.cssReset + this.headerCss;

  c.appendChild(h);

  return c;
}

/**
 * Creates close buttonr
 * @return {HTMLElement} button element
 */
__Profiler.prototype._createCloseButton = function() {
  var b = document.createElement('button');

  b.innerHTML = 'close this box &times;';
  b.style.cssText = this.cssReset + this.buttonCss;

  return b;
}

/**
 * Creates section toggle
 * @return {HTMLElement} button element
 */
__Profiler.prototype._createSectionToggle = function(sectionId) {
  var b = document.createElement('button');
  b.classList.add(sectionId);

  var section = document.getElementById(sectionId);

  b.innerHTML = 'toggle display';
  b.onclick = function(e) {
    // the class name of the toggle switch is the id of the element to toggle.
    // yeah, weird. didn't think anyone would read this.
    var t = document.getElementById(e.currentTarget.className);
    if(t.style.display === 'none' || t.style.display === undefined) {
      t.style.display = 'block';
    } else {
      t.style.display = 'none';
    }
  };
  b.style.cssText = this.cssReset + this.toggleCss;

  return b;
}

/**
 * Creates info link
 * @return {HTMLElement} link element
 */
__Profiler.prototype._createInfoLink = function() {
  var a = document.createElement('a');
  a.href = 'https://www.yammer.com/microsoft.com/#/threads/inGroup?type=in_group&feedId=4743841';
  a.target = '_blank';
  a.innerHTML = 'Yerf';
  a.style.cssText = this.cssReset;
  return a;
}

/**
 * Creates information when performance.timing is not supported
 * @return {HTMLElement} message element
 */
__Profiler.prototype._createNotSupportedInfo = function(api) {
  var p = document.createElement('p');
  p.innerHTML = 'The ' + api + ' API is not supported by your browser';
  return p;
}

/**
 * Creates main bar chart
 * @return {HTMLElement} chart container.
 */
__Profiler.prototype._createChart = function(id) {
  var chartContainer = document.createElement('div'), canvas;

  chartContainer.id = id;

  if (id === 'resourceTiming') {
    chartContainer.appendChild(this._createResourceSectionSubHeader());
    canvas = document.createElement('div');
    canvas.width = this.container.clientWidth - this.containerPadding * 2;
    this._drawWaterfall(canvas, this.resourceData);
  } else {
    chartContainer.appendChild(this._createNavigationSectionSubHeader());
    canvas = document.createElement('canvas');
    canvas.width = this.container.clientWidth - this.containerPadding * 2;
    this._drawChart(canvas);
  }

  chartContainer.appendChild(canvas);

  return chartContainer;
}

/**
 * Prepare draw function.
 *
 * @param {HTMLCanvasElement} canvas Canvas to draw on
 * @param {String} mode Either 'block' or 'point' for events
 * that have start and end or the ones that just happen.
 * @param {Object} eventData Additional event information.
 */
__Profiler.prototype._prepareDraw = function(canvas, mode, eventData) {
  var sectionData = this.sections[eventData.sectionIndex];

  var barOptions = {
    color: sectionData.color,
    sectionTimeBounds: [sectionData.startTime, sectionData.endTime],
    eventTimeBounds: [eventData.time, eventData.timeEnd],
    label: eventData.label
  }

  return this._drawBar(mode, canvas, canvas.width, barOptions);
}

/**
 * Draws a single bar on the canvas
 *
 * @param {String} mode Either 'block' or 'point' for events
 * that have start and end or the ones that just happen.
 * @param {HTMLCanvasElement} canvas Canvas to draw on.
 * @param {Number} barWidth Width of the bar.
 * @param {Object} options Other bar options.
 *  param {Array} options.color The color to use for rendering
 *                the section.
 *  param {Array} options.sectionTImeBounds Start and end times
 *                for the section. Used to draw semi-transparent
 *                 section bar.
 *  param {Array} options.eventTImeBounds Start and end times for
 *                the event itself. Used to draw event bar.
 *  param {String} options.label Name of the event to show next to
 *                 the bars.
 */
__Profiler.prototype._drawBar = function(mode, canvas, barWidth, options) {
  var start;
  var stop;
  var width;
  var timeLabel;
  var metrics;
  var color = options.color;
  var sectionStart = options.sectionTimeBounds[0];
  var sectionStop = options.sectionTimeBounds[1];
  var nameLabel = options.label;
  var context = canvas.getContext('2d');

  if (mode === 'block') {
    start = options.eventTimeBounds[0];
    stop = options.eventTimeBounds[1];
    timeLabel = start + '-' + stop;
  } else {
    start = options.eventTimeBounds[0];
    timeLabel = start;
  }
  timeLabel += 'ms';

  metrics = context.measureText(timeLabel);
  if (metrics.width > this.timeLabelWidth) {
    this.timeLabelWidth = metrics.width + 10;
    this.textSpace = this.timeLabelWidth + this.nameLabelWidth;
    this._setUnit(canvas);
  }

  return function(context) {
    if (mode === 'block') {
      width = Math.round((stop - start) * this.unit);
      width = width === 0 ? 1 : width;
    } else {
      width = 1;
    }

    // row background
    context.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',.3)';
    context.lineWidth = 1;
    context.fillStyle = 'rgba(255,255,255,0)';
    context.fillRect(0, 0, barWidth - this.textSpace, this.barHeight);
    context.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',.05)';
    context.fillRect(0, 0, barWidth - this.textSpace, this.barHeight);
    // context.strokeRect(.5, .5, Math.round(barWidth - this.textSpace -1), Math.round(this.barHeight));

    // section bar
    context.shadowColor = 'white';
    context.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',.2)';
    context.fillRect(Math.round(this.unit * sectionStart), 2, Math.round(this.unit * (sectionStop - sectionStart)), this.barHeight - 4);

    // event marker
    context.fillStyle = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
    context.fillRect(Math.round(this.unit * start), 2, width, this.barHeight - 4);

    // label
    context.fillText(timeLabel, barWidth - this.textSpace + 10, 2 * this.barHeight / 3);
    context.fillText(nameLabel, barWidth - this.textSpace + this.timeLabelWidth + 15, 2 * this.barHeight / 3);
  }
}

/**
 * Draws the chart on the canvas
 */
__Profiler.prototype._drawChart = function(canvas) {
  var time;
  var eventName;
  var options;
  var skipEvents = [];
  var drawFns = [];

  var context = canvas.getContext('2d');

  // needs to be set here for proper text measurement...
  context.font = this.fontStyle;

  this._setUnit(canvas);

  for (var i = 0, l = this.eventsOrder.length; i < l; i++) {
    var evt = this.eventsOrder[i];

    if (!this.timingData.hasOwnProperty(evt)) {
      continue;
    }

    var item = this.timingData[evt];
    var startIndex = evt.indexOf('Start');
    var isBlockStart = startIndex > -1;
    var hasBlockEnd = false;

    if (isBlockStart) {
      eventName = evt.substr(0, startIndex);
      hasBlockEnd = this.eventsOrder.indexOf(eventName + 'End') > -1;
    }

    if (isBlockStart && hasBlockEnd) {
      item.label = eventName;
      item.timeEnd = this.timingData[eventName + 'End'].time;
      drawFns.push(this._prepareDraw(canvas, 'block', item));
      skipEvents.push(eventName + 'End');
    } else if (skipEvents.indexOf(evt) < 0) {
      item.label = evt;
      drawFns.push(this._prepareDraw(canvas, 'point', item));
    }
  }

  canvas.height = this.spacing * this.barHeight * drawFns.length;

  // setting canvas height resets font, has to be re-set
  context.font = this.fontStyle;

  var step = Math.round(this.barHeight * this.spacing);

  drawFns.forEach(function(draw) {
    draw.call(this, context);
    context.translate(0, step);
  }, this);
}

/**
 * Matches events with the section they belong to
 * i.e. network, server or browser and sets
 * info about time bounds for the sections.
 */
__Profiler.prototype._matchEventsWithSections = function() {
  var data = this.timingData;

  var sections = this.sections;

  for (var i = 0, len = sections.length; i < len; i++) {
    var firstEventIndex = sections[i].firstEventIndex;
    var lastEventIndex = sections[i].lastEventIndex;

    var sectionOrder = this.eventsOrder.slice(firstEventIndex, lastEventIndex + 1);
    var sectionEvents = sectionOrder.filter(function(el) {
      return data.hasOwnProperty(el);
    });

    sectionEvents.sort(function(a, b) {
      return data[a].time - data[b].time;
    })

    firstEventIndex = sectionEvents[0];
    lastEventIndex = sectionEvents[sectionEvents.length - 1];

    sections[i].startTime = data[firstEventIndex].time;
    sections[i].endTime = data[lastEventIndex].time;

    for (var j = 0, flen = sectionEvents.length; j < flen; j++) {
      var item = sectionEvents[j];
      if (data[item]) {
        data[item].sectionIndex = i;
      }
    }
  }
}

/**
 * Gets timing data and calculates
 * when events occured as the original
 * object contains only timestamps.
 *
 * @return {Object} Hashmap of the event names
 * and times when they occured relatvely to
 * the page load start.
 */
__Profiler.prototype._getData = function() {
  if (!window.performance) {
    return;
  }

  var data = window.performance;
  var timingData = data.timing;
  var eventNames = this._getPerfObjKeys(timingData);
  var events = {};

  var startTime = timingData.navigationStart || 0;
  var eventTime = 0;
  var totalTime = 0;

  for (var i = 0, l = eventNames.length; i < l; i++) {
    var evt = timingData[eventNames[i]];

    if (evt && evt > 0) {
      eventTime = evt - startTime;
      events[eventNames[i]] = {
        time: eventTime
      };

      if (eventTime > totalTime) {
        totalTime = eventTime;
      }
    }
  }

  this.totalTime = totalTime;

  return events;
}


  /**
   * Creates array of timing entries from Resource Timing API
   * @returns array
   */
__Profiler.prototype._getResourceTimings = function() {

  var resources = [], entries = [];
  
  if(window.performance.getEntriesByType !== undefined) {
    resources = window.performance.getEntriesByType("resource");
  }
  else if(window.performance.webkitGetEntriesByType !== undefined) {
    resources = window.performance.webkitGetEntriesByType("resource");
  }
  
  // TODO: .length - 1 is a really hacky way of removing the bookmarklet script
  // Do it by name???
  for(var n = 0; n < resources.length - 1; n++) {
    entries.push(this.createEntryFromResourceTiming(resources[n]));
  }

  return entries;
};

  /**
     * Creates an entry from a PerformanceResourceTiming object 
     * @param {object} resource
     * @returns {object}
     */
  __Profiler.prototype.createEntryFromNavigationTiming = function () {

    var timing = window.performance.timing;

// TODO: Add fetchStart and duration, fix TCP, SSL etc. timings

    return {
      url: document.URL,
      start: 0,
      duration: timing.responseEnd - timing.navigationStart,
      redirectStart: timing.redirectStart === 0 ? 0 : timing.redirectStart - timing.navigationStart,
      redirectDuration: timing.redirectEnd - timing.redirectStart,
      appCacheStart: 0,                     // TODO
      appCacheDuration: 0,                    // TODO
      dnsStart: timing.domainLookupStart - timing.navigationStart,
      dnsDuration: timing.domainLookupEnd - timing.domainLookupStart,
      tcpStart: timing.connectStart - timing.navigationStart,
      tcpDuration: timing.connectEnd - timing.connectStart,   // TODO
      sslStart: 0,                        // TODO
      sslDuration: 0,                       // TODO
      requestStart: timing.requestStart - timing.navigationStart,
      requestDuration: timing.responseStart - timing.requestStart,
      responseStart: timing.responseStart - timing.navigationStart,
      responseDuration: timing.responseEnd - timing.responseStart
      }
  };

  /**
     * Creates an entry from a PerformanceResourceTiming object 
     * @param {object} resource
     * @returns {object}
   */
  __Profiler.prototype.createEntryFromResourceTiming = function(resource) {

// TODO: Add fetchStart and duration, fix TCP, SSL timings
// NB
// AppCache: start = fetchStart, end = domainLookupStart, connectStart or requestStart
// TCP: start = connectStart, end = secureConnectionStart or connectEnd
// SSL: secureConnectionStart can be undefined

    return {
      url: resource.name,
      start: resource.startTime,
      duration: resource.duration,
      redirectStart: resource.redirectStart,
      redirectDuration: resource.redirectEnd - resource.redirectStart,
      appCacheStart: 0,                     // TODO
      appCacheDuration: 0,                    // TODO
      dnsStart: resource.domainLookupStart,
      dnsDuration: resource.domainLookupEnd - resource.domainLookupStart,
      tcpStart: resource.connectStart,
      tcpDuration: resource.connectEnd - resource.connectStart,   // TODO
      sslStart: 0,                        // TODO
      sslDuration: 0,                       // TODO
      requestStart: resource.requestStart,
      requestDuration: resource.responseStart - resource.requestStart,
      responseStart: resource.responseStart,
      // ??? - Chromium returns zero for responseEnd for 3rd party URLs, bug?
      responseDuration: resource.responseStart == 0 ? 0 : resource.responseEnd - resource.responseStart
      }
  };

  /**
     * Draw waterfall
     * @param {object[]} entries
     */
  __Profiler.prototype._drawWaterfall = function (container) {

    var entries = this.resourceData;
  
    var maxTime = 0;
    for(var n = 0; n < entries.length; n++) {
      maxTime = Math.max(maxTime, entries[n].start + entries[n].duration);
    }

    container.style.cssText = 'background:#fff;margin:5px;position:relative;top:0px;left:0px;z-index:99999;margin:0px;padding:0px;';

    var rowHeight = 12;
    var rowPadding = 5;

    //calculate size of chart
    // - max time
    // - number of entries
    var width = container.width;
    var height = (entries.length + 1) * (rowHeight + rowPadding); // +1 for axis
    container.height = height;

    var svg = this.createSVG(width, height);

    // scale
    // TO DO - When to switch from seconds to milliseconds ???
    var numberOfLines = Math.ceil(maxTime/1000);
    var intervalWidth = Math.floor(width / numberOfLines);
    //var scaleFactor = maxTime / width;
    var scaleFactor = (intervalWidth / 1000);

    // draw axis
    var x1 = 0,
      y1 = rowHeight + rowPadding,
      y2 = height;

    for(var n = 0; n <= numberOfLines; n++) {
      svg.appendChild(this.createSVGText(x1, 0, 0, rowHeight, "font: 9px sans-serif;", "middle", n));
      svg.appendChild(this.createSVGLine(x1, y1, x1, y2, "stroke: #ccc;"));
      x1 += intervalWidth;
    } 

    // draw resource entries
    for(var n = 0; n < entries.length; n++) {

      var entry = entries[n];

      var row = this.createSVGGroup("translate(0," + (n + 1) * (rowHeight + rowPadding) + ")");

      row.appendChild(this.createSVGText(5, 0, 0, rowHeight, "font: 9px sans-serif;", "start", this.shortenURL(entry.url)));

      row.appendChild(this.drawBar(entry, 0, rowHeight, scaleFactor));

      svg.appendChild(row);
    }

    container.appendChild(svg);

  };



// TODO: Split out row, bar and axis drawing
// drawAxis
// drawRow()

  /**
     * Draw bar for resource 
     * @param {object} entry Details of URL, and timings for individual resource
     * @param {int} barOffset Offset of the start of the bar along  x axis
     * @param {int} rowHeight 
     * @param {double} scaleFactor Factor used to scale down chart elements
     * @returns {element} SVG Group element containing bar
     *
     * TODO: Scale bar using SVG transform? - any accuracy issues?
     */
  __Profiler.prototype.drawBar = function (entry, barOffset, rowHeight, scaleFactor) {

    var bar = this.createSVGGroup("translate(" + barOffset + ", 0)");

    bar.appendChild(this.createSVGRect(entry.start * scaleFactor, 0, entry.duration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.blocked + ",0.5)"));

// TODO: Test for 3rd party and colour appropriately

    if(entry.redirectDuration > 0) {
      bar.appendChild(this.createSVGRect(entry.redirectStart * scaleFactor , 0, entry.redirectDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.redirect + ",0.5)"));
    }

    if(entry.appCacheDuration > 0) {
      bar.appendChild(this.createSVGRect(entry.appCacheStart * scaleFactor , 0, entry.appCacheDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.appCache + ",0.5)"));
    }

    if(entry.dnsDuration > 0) {
      bar.appendChild(this.createSVGRect(entry.dnsStart * scaleFactor , 0, entry.dnsDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.dns + ",0.5)"));
    }

    if(entry.tcpDuration > 0) {
      bar.appendChild(this.createSVGRect(entry.tcpStart * scaleFactor , 0, entry.tcpDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.tcp + ",0.5)"));
    }

    if(entry.sslDuration > 0) {this.
      bar.appendChild(this.createSVGRect(entry.sslStart * scaleFactor , 0, entry.sslDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.ssl + ",0.5)"));
    }

    if(entry.requestDuration > 0) {
      bar.appendChild(this.createSVGRect(entry.requestStart * scaleFactor , 0, entry.requestDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.request + ",0.5)"));
    }

    if(entry.responseDuration > 0) {
      bar.appendChild(this.createSVGRect(entry.responseStart * scaleFactor , 0, entry.responseDuration * scaleFactor, rowHeight, "fill:rgba(" + this.barColors.response+",0.5)"));
    }

    return bar;
  };

// drawBarSegment - start, length, height, fill

  /**
     * Shorten URLs over 40 characters
     * @param {string} url URL to be shortened
     * @returns {string} Truncated URL
     *
     * TODO: Remove protocol
     */
  __Profiler.prototype.shortenURL = function(url) {
    // Strip off any query string and fragment

    var strippedURL = url.match("[^?#]*");
    var pieces = strippedURL[0].split('/');
    shorterURL = pieces[2] + " ... " + pieces[pieces.length - 1];

    return shorterURL;
  };

  /**
     * Create SVG element
     * @param {int} width
     * @param {int} height
     * @returns {element} SVG element
     */
  __Profiler.prototype.createSVG = function (width, height) {
    var el = document.createElementNS(this.xmlns, "svg");
 
    el.setAttribute("width", width);
    el.setAttribute("height", height);
    el.setAttribute("style", 'position:relative');
    return el;
  };

  /**
     * Create SVG Group element
     * @param {string} transform SVG tranformation to apply to group element
     * @returns {element} SVG Group element
     */
  __Profiler.prototype.createSVGGroup = function(transform) {    
    var el = document.createElementNS(this.xmlns, "g");
 
    el.setAttribute("transform", transform);
    
    return el;
  };

  /**
     * Create SVG Rect element
     * @param {int} x
     * @param {int} y
     * @param {int} width
     * @param {int} height
     * @param {string} style
     * @returns {element} SVG Rect element
     */
  __Profiler.prototype.createSVGRect = function(x, y, width, height, style) {
    var el = document.createElementNS(this.xmlns, "rect");
 
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("width", width);
    el.setAttribute("height", height);
    el.setAttribute("style", style);

    return el;
  };

  /**
     * Create SVG Rect element
     * @param {int} x1
     * @param {int} y1
     * @param {int} x2
     * @param {int} y2
     * @param {string} style
     * @returns {element} SVG Line element
     */
  __Profiler.prototype.createSVGLine = function(x1, y1, x2, y2, style) {
    var el = document.createElementNS(this.xmlns, "line");

    el.setAttribute("x1", x1);
    el.setAttribute("y1", y1);
    el.setAttribute("x2", x2);
    el.setAttribute("y2", y2);
    el.setAttribute("style", style);

      return el;
  };

  /**
     * Create SVG Text element
     * @param {int} x
     * @param {int} y
     * @param {int} dx
     * @param {int} dy
     * @param {string} style
     * @param {string} anchor
     * @param {string} text
     * @returns {element} SVG Text element
     */
  __Profiler.prototype.createSVGText = function(x, y, dx, dy, style, anchor, text) {
    var el = document.createElementNS(this.xmlns, "text");

    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("dx", dx);
    el.setAttribute("dy", dy);
    el.setAttribute("style", style);
    el.setAttribute("text-anchor", anchor);

    el.appendChild(document.createTextNode(text));

      return el;
  };

  // Check for Navigation Timing and Resource Timing APIs
/*
  if(window.performance !== undefined && 
    (window.performance.getEntriesByType !== undefined || 
     window.performance.webkitGetEntriesByType !== undefined)) {

    var timings = this.getResourceTimings();

    drawWaterfall(timings);
  }
  else {
    alert("Resource Timing API not supported");
  }


*/

/**
 * Actually init the chart
 */
__Profiler.prototype._init = function() {
  var performanceTimingContent, resourceTimingContent;
  this.timingData = this._getData();
  this.resourceData = this._getResourceTimings();
  this.sections = this._getSections();
  this.container = this._createContainer();

  //var customSectionHeader = this._createSectionHeader('customTiming', 'Custom Yerf Events');

  var timingSectionHeader = this._createSectionHeader('performanceTiming', 'Navigation Timing API Summary');
  var resourceSectionHeader = this._createSectionHeader('resourceTiming', 'Resource API Summary');

  //this.container.appendChild(customSectionHeader);

  this.container.appendChild(timingSectionHeader);

  if (this.customElement) {
    this.customElement.appendChild(this.container);
  } else {
    document.body.appendChild(this.container);
  }

  if (this.timingData && this.sections.length) {
    this._matchEventsWithSections();
    performanceTimingContent = this._createChart('performanceTiming');
  } else {
    performanceTimingContent = this._createNotSupportedInfo('Navigation Timing');
  }

  this.container.appendChild(performanceTimingContent);

  this.container.appendChild(resourceSectionHeader);

  if (this.resourceData) {
    resourceTimingContent = this._createChart('resourceTiming');
  } else {
    resourceTimingContent = this._createNotSupportedInfo('Resource Timing');
  }

  this.container.appendChild(resourceTimingContent);

}

/**
 * Build the overlay with the timing chart
 * @param {?HTMLElement} element If provided
 * the chart will be render in the container.
 * If not provided, container element will be created
 * and appended to the page.
 * @param {?Number} timeout Optional timeout to execute
 * timing info. Can be used to catch all events.
 * if not provided will be executed immediately.
 */
__Profiler.prototype.init = function(element, timeout) {

  if (element instanceof HTMLElement) {
    this.customElement = element;
  }

  if (timeout && parseInt(timeout, 10) > 0) {
    var self = this;
    setTimeout(function() {
      self._init();
    }, timeout);
  } else {
    this._init();
  }
}