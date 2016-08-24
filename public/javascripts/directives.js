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

app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);