var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs-extra');
var log4js = require('log4js');
var logger = require('./logger');
var globalConstants = require('./globalConstants');

try {
  let logLevel = JSON.parse(fs.readFileSync(globalConstants.websiteSettingsPath).toString()).logLevel;
  if (logLevel) {
    logger.setLevel(logLevel);
  }
} catch(e) {
  logger.error(e);
}

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

var routes = require('./routes/index');
var apiCreator = require('./routes/api');

var app = express();
var server = require('http').Server(app);

server.listen(3123);

// view engine setup
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let tokenPassword = "";
for (let i = 0; i < 10; i++) {
  tokenPassword += Math.random();
}

printerStatusController = printerStatusController(server, printerProxy);

app.use('/', routes);
app.use('/api', apiCreator(tokenPassword, printerProxy, printerStatusController));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') !== 'production') {
  app.use(function(err, req, res, next) {
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
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: err.message
  });
});

module.exports = app;

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
      log4js.shutdown(function() { 
        process.exit(); 
      });
    }

    printerStatusController.flush();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));