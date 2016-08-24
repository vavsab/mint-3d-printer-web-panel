app.controller('MainController', ['$scope', function ($scope) {
    $scope.Header = "Keep Calm Printer Console";
}]);

app.controller('DashboardController', ['$scope', '$http', function ($scope, $http) {
    var socket = io.connect();
    socket.on('status', function (data) {
        console.log(data);
        $scope.status = data;
        $scope.$apply();
    });

    $scope.isCommandRunning = false;

    $scope.sendCommand = function() {
        $scope.commandError = null;
        $scope.isCommandRunning = true;

        $http.post("/api/command/" + $scope.commandName, { isDirectCommand: true })
        .success(function (response) {
            $scope.commandSucceded = true;
        })
        .error(function (response) {
            $scope.commandSucceded = false;
            $scope.commandError = response.error;
        })
        .finally(function (response) {
            $scope.isCommandRunning = false;    
        });
    }

    $scope.Header = "Keep Calm Printer Console";
}]);