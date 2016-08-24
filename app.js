var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var printerRunner = require('./printerRunner');
var multer = require('multer');
var fs = require('fs-extra')

var uploads = multer({
  dest: './uploads/'
});


var routes = require('./routes/index');
var apiCreator = require('./routes/api');

var app = express();
var server = require('http').Server(app);

server.listen(3123);

// view engine setup
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

printerRunner.run(server);

app.use('/', routes);
app.use('/api', apiCreator(printerRunner.printerProcess, uploads));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) {
      console.log('clean');
      printerRunner.printerProcess.kill();
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