module.exports = function (server, printerProxy)
{
  function RemainingTimeCounter() {
    var initialStartTime = null;

    // initial start time but after pause/resume
    var virtualStartTime = null;

    var lastPauseTime = null;
    var doneItems = null;
    var totalItems = null;

    this.start = function () {
      initialStartTime = new Date();
      virtualStartTime = initialStartTime;
    };

    this.pause = function () {
      lastPauseTime = new Date();
    };

    this.resume = function () {
      if (lastPauseTime != null) {
        // add pause time to start time
        virtualStartTime = new Date(virtualStartTime.getTime() + (new Date() - lastPauseTime));
        lastPauseTime = null;
      }
    };

    this.setProgress = function (done, total) {
      doneItems = done;
      totalItems = total;
    };

    this.getRemainedTime = function () {
      if (virtualStartTime == null || doneItems == null || totalItems == null) {
        return null;
      }

      var averageTimePerItem = ((lastPauseTime != null ? lastPauseTime : new Date()) - virtualStartTime) / (doneItems * 1.0);

      return (totalItems - doneItems) * averageTimePerItem;
    };

    this.getDoneItems = function () {
      return doneItems;
    };

    this.getStartTime = function () {
      return initialStartTime;
    };
  };

  var remainingTimeCounter = new RemainingTimeCounter();

  var statesThatRequireRemainedTime = ['Buffering', 'PrintBuffering', 'Printing', 'Pause', 
    'PauseBuffering', 'PausePrintBuffering', 'CopyData', 'CopyDataBuffer'];

  var previousState = "Unknown";
  var stateTransitionConfiguration = [
    {from: 'Unknown', to: 'CopyData', action: 'start'},
    {from: 'Idle', to: 'CopyData', action: 'start'},

    {from: 'Unknown', to: 'CopyDataBuffer', action: 'start'},
    {from: 'Idle', to: 'CopyDataBuffer', action: 'start'},

    {from: 'Unknown', to: 'Buffering', action: 'start'},
    {from: 'Idle', to: 'Buffering', action: 'start'},
    {from: 'CopyDataBuffer', to: 'Buffering', action: 'start'},

    {from: 'Unknown', to: 'Printing', action: 'start'},
    {from: 'Idle', to: 'Printing', action: 'start'},
    {from: 'CopyData', to: 'Printing', action: 'start'},

    {from: 'Unknown', to: 'PrintBuffering', action: 'start'},
    {from: 'Idle', to: 'PrintBuffering', action: 'start'},
    {from: 'Buffering', to: 'PrintBuffering', action: 'start'},
    {from: 'CopyDataBuffer', to: 'PrintBuffering', action: 'start'},

    {from: 'Buffering', to: 'PauseBuffering', action: 'pause'},
    {from: 'PrintBuffering', to: 'PausePrintBuffering', action: 'pause'},
    {from: 'Printing', to: 'Pause', action: 'pause'},

    {from: 'PauseBuffering', to: 'Buffering', action: 'resume'},
    {from: 'PausePrintBuffering', to: 'PrintBuffering', action: 'resume'},
    {from: 'Pause', to: 'Printing', action: 'resume'}
  ];

  var requestPrinterStatusCommand = "G300";
  var self = this;
  this.currentStatus = null;
  
  this.temperatureChartData = {
    baseTemp: [],
    temp: [] 
  };

  var io = require('socket.io')(server);
  var config = require('config');
  var logger = require('./logger');
  var fs = require('fs-extra');
  var fileManagerRootPath = fs.realpathSync("files");

  var lastPrintingStatusUpdateDate = new Date(0); // Status for printing process
  var browserSockets = [];

  printerProxy.on('connected', function() {
    printerProxy.send(requestPrinterStatusCommand); // Request printer status
  });

  // Request status in idle mode
  setInterval(function () {
    if (new Date() - lastPrintingStatusUpdateDate > 3000) {
      printerProxy.send(requestPrinterStatusCommand); // Request printer status
    }
  }, 3000);

  printerProxy.on('data', function(data) {
    data = data.toString();
    logger.trace("printerStatusController: Data received: " + data);
    if (data.includes("End print")) {
      // to receive the last status message
      lastPrintingStatusUpdateDate = new Date(0);
      browserSockets.forEach(function(socket, i, arr) {
        socket.emit("event", { type: "endPrint" });
      });
      
      return;
    }

    if (browserSockets.length > 0 && new Date() - lastPrintingStatusUpdateDate > 1000) {
      var strings = data.split("\n");
      strings.forEach(function(item, i, arr) { 
        if (item.startsWith("I")) {
          lastPrintingStatusUpdateDate = new Date();
          item = item.substr(1);

          var status;
          try {
            status = eval("(" + item + ")");
          } catch (error) {
            logger.warn("Could not parse JSON '" + item + "': " + error);
            return;
          }

          status.date = new Date();

          temperatureChartData.baseTemp.push({date: status.date, value: status.baseTemp});
          temperatureChartData.temp.push({date: status.date, value: status.temp});

          while (temperatureChartData.baseTemp.length > 30) {
            temperatureChartData.baseTemp.shift();
            temperatureChartData.temp.shift();
          };
          

          if (status.State !== undefined) {
            var statusMap = ["Idle", "CopyData", "CopyDataBuffer", "Buffering",
	            "PrintBuffering",	"Printing",	"Pause", "PauseBuffering", 
              "PausePrintBuffering"];
            
            if (statusMap.hasOwnProperty(status.State)) {
              status.state = statusMap[status.State];
            } else {
              status.state = "Unknown";
            }

            status.stateCode = status.State;
            delete status.State; 

            // Apply transition action for calculating remaining time
            var transition = null;
            for (var i = 0; i < stateTransitionConfiguration.length; i++) {
              var current = stateTransitionConfiguration[i];
              if (current.from === previousState && current.to === status.state) {
                remainingTimeCounter[current.action]();
                break;
              }
            }

            previousState = status.state;
          }

          status.remainedMilliseconds = null;
          
          if (status.line_index != null && status.line_count != null) {
            remainingTimeCounter.setProgress(status.line_index, status.line_count);
          }

          if (statesThatRequireRemainedTime.indexOf(status.state) != -1) {
            status.startDate = remainingTimeCounter.getStartTime(); 
            if (remainingTimeCounter.getDoneItems() > 100) {
              status.remainedMilliseconds = remainingTimeCounter.getRemainedTime();
              status.endDate = new Date(new Date().getTime() + status.remainedMilliseconds);  
            }
          }

          // filter absolute path
          if (status.fileName) {
            status.fileName = status.fileName.replace(fileManagerRootPath, '');
          }

          self.currentStatus = status;
          
          browserSockets.forEach(function(socket, i, arr) {       
            socket.emit('status', status);
          });

          logger.trace("printerStatusController: sent status to subscribers");
      }});
    }
  });

  io.on('connection', function (socket) {
    logger.info("socket connected")
    browserSockets.push(socket)

    socket.on('disconnect', function () {
        logger.info("socket disconnected")
        browserSockets.splice(browserSockets.indexOf(socket), 1);
    });
  });

  return this;
}