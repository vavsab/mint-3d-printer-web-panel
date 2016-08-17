app.controller('MainController', ['$scope', function ($scope) {
    var socket = io.connect();
    socket.on('status', function (data) {
        console.log(data);
        $scope.status = data;
        $scope.$apply();
    });
}]);