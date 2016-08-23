module.exports.run = function (server)
{
  var io = require('socket.io')(server);
  var spawn = require('child_process').spawn;
  var config = require('config');

  console.log("Run printer: '" + config.get("PrinterFilePath") + "'");
  var printerProcess = spawn(config.get("PrinterFilePath"));
  module.exports.printerProcess = printerProcess;
  
  var lastStatusUpdateDate = new Date(0);
  var browserSockets = [];

  printerProcess.stdout.on('data', function(data) {
    console.log("Data from printer was received");
    if (browserSockets.length > 0 && new Date() - lastStatusUpdateDate > 1000)
    {
      data = data.toString();
      console.log(data);
      var strings = data.split("\n");
      strings.forEach(function(item, i, arr) { 
        if (item.startsWith("I")) {
          lastStatusUpdateDate = new Date();
          item = item.substr(1);
          console.log("sent status");
          browserSockets.forEach(function(socket, i, arr) {
            socket.emit('status', eval("(" + item + ")"));
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
} 