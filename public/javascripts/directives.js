app.directive('actionButton', function () {
    return {
        scope: {
            action: '&',
            buttonName: '@',
            disabled: '=',
            type: '@',
            icon: '@'
        },
        controller: ['$scope', '$http', function ($scope, $http) {
            $scope.isActionRunning = false;
            if (!$scope.type) {
                $scope.type = 'default';
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

app.directive('validationFloat', function () {
    var isValid = function(s) {
        return /^\d+(.\d+)?$/.test(s);
    };

    return {
        require:'ngModel',
        link: function (scope, elm, attrs, ngModelCtrl) {

            ngModelCtrl.$parsers.unshift(function (viewValue) {
                ngModelCtrl.$setValidity('float', isValid(viewValue));
                return parseFloat(viewValue);
            });

            ngModelCtrl.$formatters.unshift(function (modelValue) {
                ngModelCtrl.$setValidity('float', isValid(modelValue));
                return parseFloat(modelValue);
            });
        }
    };
});