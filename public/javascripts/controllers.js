app.controller('MainController', ['$scope', function ($scope) {
    var socket = io.connect('http://localhost');
    socket.on('news', function (data) {
        alert(data);
        socket.emit('my other event', { my: 'data' });
    });
}]);