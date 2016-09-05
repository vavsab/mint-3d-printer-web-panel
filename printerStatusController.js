module.exports = function (server, printerProxy)
{
  var io = require('socket.io')(server);
  var config = require('config');

  var lastStatusUpdateDate = new Date(0);
  var startPrintDate = null;
  var browserSockets = [];

  printerProxy.on('data', function(data) {
    data = data.toString();
    console.log("printerStatusController: Data received: " + data);
    if (data.startsWith("End print")) {
      // to receive the last status message
      lastStatusUpdateDate = new Date(0);
      browserSockets.forEach(function(socket, i, arr) {
        socket.emit("event", { type: "endPrint" });
      });
      
      return;
    }

    if (browserSockets.length > 0 && new Date() - lastStatusUpdateDate > 1000) {
      var strings = data.split("\n");
      strings.forEach(function(item, i, arr) { 
        if (item.startsWith("I")) {
          lastStatusUpdateDate = new Date();
          item = item.substr(1);
          console.log("printerStatusController: sent status to subscribers");
          browserSockets.forEach(function(socket, i, arr) {
            var status = eval("(" + item + ")");
            status.remainedMilliseconds = null;

            if (startPrintDate != null) {
              try {
                status.remainedMilliseconds = (status.line_count - status.line_index) * ((new Date() - startPrintDate) / status.line_index);
              } catch(error) {
                console.log("printerStatusController: Error while calculating remainedMilliseconds variable: " + error)
              }  
            }

            socket.emit('status', status);
          });
        }
      });
    } 
  });

  printerProxy.on('sent_to_printer', function(data) {
    if (data.startsWith("start")) {
        startPrintDate = new Date();
    }
  });

  io.on('connection', function (socket) {
    console.log("socket connected")
    browserSockets.push(socket)

    socket.on('disconnect', function () {
        console.log("socket disconnected")
        browserSockets.splice(browserSockets.indexOf(socket), 1);
    });
  });
} 