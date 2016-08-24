app.directive('commandButton', function () {
    return {
        scope: {
            commandName: '@',
        },
        controller: ['$scope', '$http', function ($scope, $http) {
            $scope.isCommandRunning = false,
            $scope.sendCommand = function(commandName) {
                $scope.commandError = null;
                $scope.isCommandRunning = true;

                $http.post("/api/command/" + commandName)
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
        }],
        templateUrl: '/partials/commandButton.html'
    };
});