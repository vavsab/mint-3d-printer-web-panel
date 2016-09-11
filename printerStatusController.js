module.exports = function (server, printerProxy)
{
  var requestPrinterStatusCommand = "G300";
  var self = this;
  this.currentStatus = null;

  var io = require('socket.io')(server);
  var config = require('config');
  var logger = require('./logger');

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
      lastPrintingStatusUpdateDate = new Date();
    }
  }, 3000);

  printerProxy.on('data', function(data) {
    data = data.toString();
    logger.info("printerStatusController: Data received: " + data);
    if (data.startsWith("End print")) {
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
          logger.info("printerStatusController: sent status to subscribers");
          browserSockets.forEach(function(socket, i, arr) {
            var status = eval("(" + item + ")");
            status.remainedMilliseconds = null;
            if (status.isPrint == 1 && status.line_index > 100) {
              if (startPrintDate == null) {
                startPrintDate = new Date();
              }
            } else {
              startPrintDate = null;
            }

            if (startPrintDate != null) {
              try {
                status.remainedMilliseconds = (status.line_count - status.line_index) * ((new Date() - startPrintDate) / status.line_index);
              } catch(error) {
                logger.info("printerStatusController: Error while calculating remainedMilliseconds variable: " + error)
              }  
            }

            self.currentStatus = status;
            socket.emit('status', status);
          });
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