module.exports = (server) => {
    let self = this;
    let logger = require('../logger');
    let io = require('socket.io')(server);
    let browserSockets = [];

    io.on('connection', (socket) => {
        logger.info("socket connected")
        browserSockets.push(socket)

        socket.on('disconnect', function () {
            logger.info("socket disconnected")
            browserSockets.splice(browserSockets.indexOf(socket), 1);
        });
    });

    self.sendToAll = (messageType, messageBody) => {
        logger.trace(`Sockets > sendToAll > ${messageType} ${JSON.stringify(messageBody)}`);
        browserSockets.forEach(function(socket, i, arr) {       
            socket.emit(messageType, messageBody);
        });
    }

    self.getClientsCount = () => browserSockets.length;

    return self;
}