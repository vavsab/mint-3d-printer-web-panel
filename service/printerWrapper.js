const app = require('express')();
const server = require('http').Server(app);
const spawn = require('child_process').spawn;
const config = require('config');
const log4js = require('log4js');
const fs = require('fs-extra');
const globalConstants = require('./globalConstants');
const configurationController = require('./controllers/configurationController');

if (!fs.existsSync('logs')){
    fs.mkdirSync('logs');
}

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

configurationController.get(configurationController.KEY_WEBSITE_SETTINGS)
.then((websiteSettings) => {
  try {
    let logLevel = websiteSettings.logLevel;
    if (logLevel) {
      logger.setLevel(logLevel);
    }
  } catch(e) {
    logger.error(e);
  }
})
.then(() => {
    const port = 5555;
    server.listen(port);
    logger.info('listening to ' + port);

    var socketIo = require('socket.io')(server);
    var browserSockets = [];
    var printerProcess = spawn(config.get("PrinterFilePath"));

    socketIo.on('connection', (socket) => {
        logger.info("socket connected")
        browserSockets.push(socket);

        socket.on('disconnect', () => {
            logger.info("socket disconnected")
            browserSockets.splice(browserSockets.indexOf(socket), 1);
        });

        socket.on('stdin', (data) => {
            logger.trace('stdin: ' + data);
            printerProcess.stdin.write(data);
        });

        socket.on('setLoggerLevel', (level) => {
            logger.setLevel(level);
        });
    });

    printerProcess.stderr.on('data', (data) => {
        data = data.toString();
        logger.error(data);

        browserSockets.forEach((socket, i, arr) => {
            socket.emit('stderr', data);
        });
    });

    printerProcess.stdout.on('data', (data) => {
        data = data.toString();
        logger.trace("Data from printer was received: " + data);

        if (data.startsWith('r') || data.startsWith('g') || data.startsWith('m')) {
            return;
        }

        browserSockets.forEach((socket, i, arr) => socket.emit('stdout', data));
    });

    printerProcess.on('exit', () => {
        logger.info('Exit bacause printer process stopped');
        logger.info("Flush logger and exit");
        log4js.shutdown(() => process.exit());
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
            log4js.shutdown(() => process.exit());
        }
    }

    process.on('unhandledRejection', (reason, p) => {
        logger.error(`Unhandled promise rejection: ${reason}`);
    });

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
});