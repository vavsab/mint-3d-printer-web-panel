const express = require('express');
const http = require('http');
const path = require('path');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const log4js = require('log4js');
const logger = require('./logger');
const globalConstants = require('./globalConstants');
const databaseMigrations = require('./databaseMigrations');
const repository = require('./repository');
const socketControllerFactory = require('./controllers/socketController');
const updateControllerFactory = require('./controllers/updateController');
const networkControllerFactory = require('./controllers/networkController');

const port = 3123;

try {
  let logLevel = JSON.parse(fs.readFileSync(globalConstants.websiteSettingsPath).toString()).logLevel;
  if (logLevel) {
    logger.setLevel(logLevel);
  }
} catch(e) {
  logger.error(e);
}

databaseMigrations.update().then(() => {

  if (!fs.existsSync('logs')){
    fs.mkdirSync('logs');
  }

  if (!fs.existsSync('files')){
    fs.mkdirSync('files');
  }

  var printerStatusController = require('./printerStatusController');
  var logger = require('./logger');
  var printerProxy = require('./printerProxy');
  printerProxy = new printerProxy();

  var app = express();
  var server = require('http').Server(app);
  server.listen(3123);
  server.on('listening', () => console.log(`Site is listening on port ${port}`));

  // view engine setup
  app.set('view engine', 'html');

  // uncomment after placing your favicon in /public
  //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(morgan('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  repository.getTokenPassword().then(tokenPassword => {
    let socketController = socketControllerFactory(server);
    let updateController = updateControllerFactory(socketController);
    let networkController = networkControllerFactory();

    printerStatusController = printerStatusController(socketController, printerProxy);

    var routes = require('./routes/index');
    var apiFactory = require('./routes/api');
    var apiSettingsFactory = require('./routes/api.settings');

    app.use('/', routes);
    app.use('/api', apiFactory(tokenPassword, printerProxy, printerStatusController));
    app.use('/api', apiSettingsFactory(updateController, networkController));

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') !== 'production') {
      app.use((err, req, res, next) => {
        logger.error(err);
        res.status(err.status || 500);
        res.json({
          error: err.message,
          stack: err
        });
      });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use((err, req, res, next) => {
      res.status(err.status || 500);
      res.json({
        error: err.message
      });
    });
  });

  process.stdin.resume(); //so the program will not close instantly

  function exitHandler(options, err) {
      if (options.cleanup) {
        console.log('Application cleanup');
      }
      
      if (err) {
        logger.error(err);
        logger.error(err.stack);
      }
      
      if (options.exit) {
        logger.info("Flush logger and exit");
        log4js.shutdown(() => process.exit());
      }

      if (printerStatusController.flush) {
        printerStatusController.flush();
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