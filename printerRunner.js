module.exports = function (server)
{
  var io = require('socket.io')(server);
  var spawn = require('child_process').spawn;
  var config = require('config');

  console.log("Run printer: '" + config.get("PrinterFilePath") + "'");
  var printerProcess = spawn(config.get("PrinterFilePath"));

  var lastStatusUpdateDate = new Date(0);
  var startPrintDate = null;
  var browserSockets = [];

  printerProcess.stdout.on('data', function(data) {
    console.log("Data from printer was received: " + data);

    if (browserSockets.length > 0 && new Date() - lastStatusUpdateDate > 1000) {
      data = data.toString();
      var strings = data.split("\n");
      strings.forEach(function(item, i, arr) { 
        if (item.startsWith("I")) {
          lastStatusUpdateDate = new Date();
          item = item.substr(1);
          console.log("sent status");
          browserSockets.forEach(function(socket, i, arr) {
            var status = eval("(" + item + ")");
            status.remainedMilliseconds = null;

            if (startPrintDate != null) {
              try {
                status.remainedMilliseconds = (status.line_count - status.line_index) * ((new Date() - startPrintDate) / status.line_index);
              } catch(error) {
                console.log("Error while calculating remainedMilliseconds variable: " + error)
              }  
            }

            socket.emit('status', status);
          });
        }
      });
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

  return {
    send: function(data) {
      printerProcess.stdin.write(data);
      if (data.startsWith("start")) {
        startPrintDate = new Date();
      }
    },
    kill: function() {
      printerProcess.kill();
      console.log("killed printer process");
    }
  }
} 