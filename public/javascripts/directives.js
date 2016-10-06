app.directive('actionButton', function () {
    return {
        scope: {
            action: '&',
            buttonName: '@',
            type: '@',
            icon: '@'
        },
        controller: ['$scope', '$http', function ($scope, $http) {
            $scope.isActionRunning = false;

            $scope.buttonClass = "btn-" + ($scope.type ? $scope.type : 'default');

            if ($scope.icon) {
                $scope.iconClass = 'glyphicon-' + $scope.icon;
            }

            $scope.runAction = function() {
                $scope.actionError = null;
                $scope.isActionRunning = true;

                var actionDefer = $scope.action();
                if (actionDefer == null) {
                    $scope.isActionRunning = false;
                } else {
                    actionDefer.then(
                        function success() {
                            $scope.actionSucceded = true;
                        },
                        function error(error) {
                            $scope.actionSucceded = false;
                            $scope.actionError = error;
                    })
                    .finally(function () {
                        $scope.isActionRunning = false;    
                    });
                }
            }
        }],
        templateUrl: '/partials/actionButton.html'
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