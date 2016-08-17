var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var spawn = require('child_process').spawn;

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3123);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

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

var printerProcess = spawn('./printer');

var lastStatusUpdateDate = new Date(0);
var browserSockets = [];

printerProcess.stdout.on('data', function(data) {
    if (browserSockets.length > 0 && new Date() - lastStatusUpdateDate > 1000)
    {
      data = data.toString();
      console.log(data);
      var strings = data.split("\n");
      strings.forEach(function(item, i, arr) { 
        if (item.startsWith("I"))
        {
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

module.exports = app;

process.stdin.resume();//so the program will not close instantly

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