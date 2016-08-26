app.directive('commandButton', function () {
    return {
        scope: {
            commandName: '@',
        },
        controller: ['$scope', '$http', 'commandService', function ($scope, $http, commandService) {
            $scope.isCommandRunning = false,
            $scope.sendCommand = function(commandName) {
                $scope.commandError = null;
                $scope.isCommandRunning = true;

                commandService.sendCommand(commandName)
                .then(
                    function success() {
                        $scope.commandSucceded = true;
                    },
                    function error(error) {
                        $scope.commandSucceded = false;
                        $scope.commandError = error;
                    }
                )
                .finally(function () {
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