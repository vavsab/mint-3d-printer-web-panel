var util = require('util');
var eventEmitter = require('events').EventEmitter;
var logger = require('./logger');

var proxy = function () {
    var self = this;
    var socket = require('socket.io-client')('http://localhost:5555');
    var buffer = "";

    this.send = function(data) {
        if (!socket.connected)
            return false;

        self.emit('sent_to_printer', data);
        socket.emit('stdin', data + '\n');
        logger.trace('printerProxy: sent: ' + data);
        return true;
    };

    this.setLoggerLevel = function(level) {
        if (!socket.connected)
            return false;

        socket.emit('setLoggerLevel', level);
    };

    socket.on('connect', function(){
        logger.info('printerProxy: Printer service connected');
        self.emit('connected');
    });

    socket.on('stdout', function(data) {
        buffer += data;
        if (data[data.length - 1] == '\n') {
            self.emit('data', buffer);
            buffer = "";            
        }
    });

    socket.on('stderr', function(data) {
        self.emit("error", data);
    });

    socket.on('disconnect', function() {
        logger.info('printerProxy: Printer service disconnected');
        self.emit('disconnected');
    });
};

util.inherits(proxy, eventEmitter);

module.exports = proxy;