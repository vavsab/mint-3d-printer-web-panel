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
        filename: 'logs/printerWrapper', 
        category: 'printerWrapper',
        pattern: "-yyyy-MM-dd.log",
        alwaysIncludePattern: true }
  ]
});

var logger = log4js.getLogger('printerWrapper');

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
        logger.trace('stdin: ' + data);
        printerProcess.stdin.write(data);
    });
});

printerProcess.stderr.on('data', function(data) {
    data = data.toString();
    logger.error(data);

    browserSockets.forEach(function(socket, i, arr) {
        socket.emit('stderr', data);
    });
});

printerProcess.stdout.on('data', function(data) {
    data = data.toString();
    logger.trace("Data from printer was received: " + data);

    if (data.startsWith('r') || data.startsWith('g') || data.startsWith('m')) {
        return;
    }

    browserSockets.forEach(function(socket, i, arr) {
        socket.emit('stdout', data);
    });
});

printerProcess.on('exit', function () {
    logger.info('Exit bacause printer process stopped');
    logger.info("Flush logger and exit");
    log4js.shutdown(function() { 
        process.exit(); 
    });
});

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('Application cleanup');
        printerProcess.kill();
    }

    if (err) {
        logger.error(err);
        logger.error(err.stack);
    }

    if (options.exit) {
        logger.info("Flush logger and exit");
        log4js.shutdown(function() { 
            process.exit(); 
        });
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));