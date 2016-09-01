var util = require('util');
var eventEmitter = require('events').EventEmitter;

var proxy = function () {
    var self = this;
    var socket = require('socket.io-client')('http://localhost:5555');

    socket.on('connect', function(){
        console.log('printerProxy: Printer service connected');
    });

    socket.on('stdout', function(data) {
        self.emit('data', data)
    });

    socket.on('disconnect', function() {
        console.log('printerProxy: Printer service disconnected');
    });
 
    this.send = function(data) {
        if (!socket.connected)
            return false;

        socket.emit('stdin', data);
        console.log('printerProxy: sent: ' + data);
        return true;
    };
};

util.inherits(proxy, eventEmitter);

module.exports = proxy;