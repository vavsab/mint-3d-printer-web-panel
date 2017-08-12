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
const utils = require('./utils');
const globalConstants = require('./globalConstants');
const databaseMigrations = require('./databaseMigrations');
const repository = require('./repository');
const config = require('config');
const configurationController = require('./controllers/configurationController');
const socketControllerFactory = require('./controllers/socketController');
const updateControllerFactory = require('./controllers/updateController');
const networkControllerFactory = require('./controllers/networkController');
const powerControllerFactory = require('./controllers/powerController');
const printerStatusControllerFactory = require('./controllers/printerStatusController');

const port = 3123;

databaseMigrations.update()
.then(() => configurationController.get(configurationController.KEY_WEBSITE_SETTINGS))
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
  
  const fileManagerRootPath = utils.getPathFromBase(config.get('pathToFilesFolder'));
  if (!fs.existsSync(fileManagerRootPath)) {
      fs.mkdirSync(fileManagerRootPath);
      logger.info(`Files folder was created on '${fileManagerRootPath}'`);
  }

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
  app.use(express.static(path.join(__dirname, '../public')));

  repository.getTokenPassword().then(tokenPassword => {
    const socketController = socketControllerFactory(server);
    const updateController = updateControllerFactory(socketController);
    const networkController = networkControllerFactory();
    const printerStatusController = printerStatusControllerFactory(socketController, printerProxy);
    const powerController = powerControllerFactory(socketController, printerProxy, printerStatusController);

    const routes = require('./routes/index');
    const apiFactory = require('./routes/api');
    const apiSettingsFactory = require('./routes/api.settings');
    const apiPowerFactory = require('./routes/api.power');

    const powerRouters = apiPowerFactory(powerController);
    const settingsRouters = apiSettingsFactory(updateController, networkController, printerProxy);

    app.use('/', routes);
    app.use('/api', powerRouters.openRouter);
    app.use('/api', settingsRouters.openRouter);
    app.use('/api', apiFactory(tokenPassword, printerProxy, printerStatusController));
    app.use('/api', settingsRouters.router);
    app.use('/api', powerRouters.router);

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
    logger.error(`Unhandled promise rejection: ${reason}. Promise: ${JSON.stringify(p)}`);
  });

  //do something when app is closing
  process.on('exit', exitHandler.bind(null, { cleanup: true }));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, { exit: true}));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
});