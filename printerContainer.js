var app = require('express')();
var server = require('http').Server(app);
var spawn = require('child_process').spawn;
var config = require('config');

var port = 5555;
server.listen(port);
console.log('listening to ' + port);

var socketIo = require('socket.io')(server);
var browserSockets = [];
var printerProcess = spawn(config.get("PrinterFilePath"));

socketIo.on('connection', function (socket) {
    console.log("socket connected")
    browserSockets.push(socket);

    socket.on('disconnect', function () {
        console.log("socket disconnected")
        browserSockets.splice(browserSockets.indexOf(socket), 1);
    });

    socket.on('stdin', function (data) {
        consol.log('stdin: ' + data);
        printerProcess.stdin.write(data);
    });
});

printerProcess.stdout.on('data', function(data) {
    data = data.toString();
    console.log("Data from printer was received: " + data);
    browserSockets.forEach(function(socket, i, arr) {
        socket.emit('stdout', data);
    });
});

printerProcess.on('exit', function () {
    process.exit()
});

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('clean');
        printerProcess.kill();
    }

    if (err) {
        console.log(err.stack);
    }

    if (options.exit) {
        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));