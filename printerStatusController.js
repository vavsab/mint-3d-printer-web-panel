module.exports = function (server, printerProxy)
{
  var requestPrinterStatusCommand = "G300";
  var self = this;
  this.currentStatus = null;

  var io = require('socket.io')(server);
  var config = require('config');
  var logger = require('./logger');
  var fs = require('fs-extra');
  var fileManagerRootPath = fs.realpathSync("files");

  var lastPrintingStatusUpdateDate = new Date(0); // Status for printing process
  var startPrintDate = null;
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

          status.remainedMilliseconds = null;
          if (status.isPrint == 1) {
            if (startPrintDate == null) {
              startPrintDate = new Date();
            }
          } else {
            startPrintDate = null;
          }

          if (startPrintDate != null && status.line_index > 100) {
            try {
              status.remainedMilliseconds = (status.line_count - status.line_index) * ((new Date() - startPrintDate) / status.line_index);
            } catch(error) {
              logger.warn("printerStatusController: Error while calculating remainedMilliseconds variable: " + error)
            }  
          }

          // filter absolute path
          if (status.fileName) {
            status.fileName = status.fileName.replace(fileManagerRootPath, '');
          }

          status.startPrintDate = startPrintDate;
          status.endPrintDate = null;

          if (status.remainedMilliseconds != null) {
            status.endPrintDate = new Date(new Date().getTime() + status.remainedMilliseconds);
          }

          self.currentStatus = status;
          
          browserSockets.forEach(function(socket, i, arr) {       
            socket.emit('status', status);
          });

          logger.trace("printerStatusController: sent status to subscribers");
        }
      });
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