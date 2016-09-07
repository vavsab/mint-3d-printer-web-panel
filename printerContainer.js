var app = require('express')();
var server = require('http').Server(app);
var spawn = require('child_process').spawn;
var config = require('config');
var log4js = require('log4js');

log4js.configure({
  appenders: [
    { type: 'console' },
    { 
        type: 'dateFile', 
        filename: 'logs/printerContainer', 
        category: 'printerContainer',
        pattern: "-yyyy-MM-dd.log",
        alwaysIncludePattern: true }
  ]
});

var logger = log4js.getLogger('printerContainer');

var port = 5555;
server.listen(port);
logger.info('listening to ' + port);

var socketIo = require('socket.io')(server);
var browserSockets = [];
var printerProcess = spawn(config.get("PrinterFilePath"));

socketIo.on('connection', function (socket) {
    logger.info("socket connected")
    browserSockets.push(socket);

    socket.on('disconnect', function () {
        logger.info("socket disconnected")
        browserSockets.splice(browserSockets.indexOf(socket), 1);
    });

    socket.on('stdin', function (data) {
        logger.info('stdin: ' + data);
        printerProcess.stdin.write(data);
    });
});

printerProcess.stderr.on('data', function(data) {
    data = data.toString();
    logger.error(data);
});

printerProcess.stdout.on('data', function(data) {
    data = data.toString();
    logger.info("Data from printer was received: " + data);
    browserSockets.forEach(function(socket, i, arr) {
        socket.emit('stdout', data);
    });
});

printerProcess.on('exit', function () {
    logger.info('exit bacause printer process stopped');
    process.exit()
});

function exitHandler(options, err) {
    if (options.cleanup) {
        logger.info('clean');
        printerProcess.kill();
    }

    if (err) {
        logger.error(err);
        logger.error(err.stack);
    }

    if (options.exit) {
        logger.info("exit");
        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));