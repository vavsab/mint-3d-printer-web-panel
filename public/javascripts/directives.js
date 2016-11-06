app.directive('actionButton', ['printerStatusService', 'printerStatus', 
function (printerStatusService, printerStatus) {
    return {
        scope: {
            action: '&',
            buttonName: '@',
            disabled: '=',
            type: '@',
            icon: '@',
            disableWhenPrinterIsInState: '@',
            allowWhenPrinterIsInState: '@'
        },
        controller: ['$scope', '$http', function ($scope, $http) {
            $scope.isActionRunning = false;
            $scope.forbiddenPrinterState = false;

            var refreshState = function (printerState) {
                if ($scope.disableWhenPrinterIsInState) {
                    $scope.forbiddenPrinterState = $scope.disableWhenPrinterIsInState.split('|').indexOf(printerState) != -1;
                }

                if ($scope.allowWhenPrinterIsInState) {
                    $scope.forbiddenPrinterState = $scope.allowWhenPrinterIsInState.split('|').indexOf(printerState) == -1;
                }
            };

            if (printerStatus.status != null) {
                refreshState(printerStatus.status.state);
            }
            
            
            var onStatusReceived = function (status) {
                if (!$scope.disableWhenPrinterIsBusy)
                    return;
                refreshState(status.state);
                $scope.$applyAsync();
            };

            printerStatusService.eventAggregator.on('statusReceived', onStatusReceived);

            $scope.$on('$destroy', function () {
                printerStatusService.eventAggregator.unsubscribe('statusReceived', onStatusReceived);
            });

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
}]);

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
        return /^-?\d+(.\d+)?$/.test(s);
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


app.directive('ngKeyboard', ['ngVirtualKeyboardService', '$timeout', 'browserSettings',
	function(ngVirtualKeyboardService, $timeout, browserSettings) {
		return {
			restrict: 'A',
			require: '?ngModel',
			scope: {
				config: '=ngKeyboard'
			},
			link: function(scope, elements, attrs, ngModelCtrl) {
                if (!browserSettings.showVirtualKeyboard) {
                    return;
                }

				if (!ngModelCtrl) {
					return;
				}

				ngVirtualKeyboardService.attach(elements[0], scope.config, function(e, kb, el) {
					$timeout(function() {
						ngModelCtrl.$setViewValue(elements[0].value);
					});
				});
			}
		};
	}
]);