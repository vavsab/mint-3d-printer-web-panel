app.controller('MainController', ['$scope', function ($scope) {
    $scope.Header = "Keep Calm Printer Console";
}]);

app.controller('DashboardController', ['$scope', function ($scope) {
    var socket = io.connect();
    socket.on('status', function (data) {
        console.log(data);
        $scope.status = data;
        $scope.$apply();
    });

    $scope.Header = "Keep Calm Printer Console";
}]);