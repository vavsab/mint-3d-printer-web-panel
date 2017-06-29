module.exports = (socketController, printerProxy) =>
{
  function RemainingTimeCounter() {
    var initialStartTime = null;

    // initial start time but after pause/resume
    var virtualStartTime = null;

    var lastPauseTime = null;
    var doneItems = null;
    var totalItems = null;

    this.start = () => {
      initialStartTime = new Date();
      virtualStartTime = initialStartTime;
    };

    this.pause = () => {
      lastPauseTime = new Date();
    };

    this.resume = () => {
      if (lastPauseTime != null) {
        // add pause time to start time
        virtualStartTime = new Date(virtualStartTime.getTime() + (new Date() - lastPauseTime));
        lastPauseTime = null;
      }
    };

    this.setProgress = (done, total) => {
      doneItems = done;
      totalItems = total;
    };

    this.getRemainedTime = () => {
      if (virtualStartTime == null || doneItems == null || totalItems == null) {
        return null;
      }

      var averageTimePerItem = ((lastPauseTime != null ? lastPauseTime : new Date()) - virtualStartTime) / (doneItems * 1.0);

      return (totalItems - doneItems) * averageTimePerItem;
    };

    this.getDoneItems = () => doneItems;
    this.getStartTime = () => initialStartTime;
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
  var requestPrinterSerialCommand = "M1";
  var self = this;
  this.currentStatus = null;

  this.temperatureChartData = {
    baseTemp: [],
    temp: [] 
  };

  var config = require('config');
  var logger = require('./logger');
  var fs = require('fs-extra');
  var fileManagerRootPath = fs.realpathSync("files");

  var lastPrintingStatusUpdateDate = new Date(0); // Status for printing process

  var printerErrorsFilePath = 'logs/lastPrinterErrros.json'; 
  var maxPrinterErrorCount = 50;
  this.lastPrinterErrors = [];

  if (fs.existsSync(printerErrorsFilePath)) {
    try {
      self.lastPrinterErrors = JSON.parse(fs.readFileSync(printerErrorsFilePath))
    } catch (error) {
      self.lastPrinterErrors = [];
    }
  }

  printerProxy.on('connected', () => {
    printerProxy.send(requestPrinterStatusCommand); // Request printer status
  });

  // Request status in idle mode
  setInterval(() => {
    if (new Date() - lastPrintingStatusUpdateDate > 1000) {
      printerProxy.send(requestPrinterStatusCommand); // Request printer status
      if(socketController.ID === undefined)
        printerProxy.send(requestPrinterSerialCommand); // Request printer serial
    }
  }, 1000);

  printerProxy.on('data', (data) => {
    data = data.toString();
    logger.trace("printerStatusController: Data received: " + data);
    if (data.includes("End print")) {
      // to receive the last status message
      lastPrintingStatusUpdateDate = new Date(0);
      socketController.sendToAll('event', { type: 'endPrint'});
      
      return;
    }

    if (socketController.getClientsCount() > 0 && new Date() - lastPrintingStatusUpdateDate > 1000) {
      var strings = data.split("\n");
      strings.forEach((item, i, arr) => { 
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
          if(status.hasOwnProperty('ID')){
            socketController.ID = status.ID;
            return;
          }
          status.date = new Date();

          self.temperatureChartData.baseTemp.push({date: status.date, value: status.baseTemp});
          self.temperatureChartData.temp.push({date: status.date, value: status.temp});

          while (self.temperatureChartData.baseTemp.length > 30) {
            self.temperatureChartData.baseTemp.shift();
            self.temperatureChartData.temp.shift();
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
          
          socketController.sendToAll('status', status);

          logger.trace("printerStatusController: sent status to subscribers");
      }});
    }
  });

  printerProxy.on('error', (data) => { 
    self.lastPrinterErrors.push({ date: new Date(), message: data});
    while (self.lastPrinterErrors.length > maxPrinterErrorCount){
      self.lastPrinterErrors.shift();
    }
  });

  this.flush = () => {
    fs.writeFileSync(printerErrorsFilePath, JSON.stringify(self.lastPrinterErrors));
  }

  return this;
}