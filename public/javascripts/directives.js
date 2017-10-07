app.directive('actionButton', ['printerStatusService', 'printerStatus', 
function (printerStatusService, printerStatus) {
    return {
        scope: {
            action: '&',
            buttonName: '@',
            disabled: '=',
            popoverPlacement: '@',
            type: '@',
            icon: '@',
            disableWhenPrinterIsInState: '@',
            allowWhenPrinterIsInState: '@'
        },
        controller: ['$scope', '$http', function ($scope, $http) {
            $scope.isActionRunning = false;
            $scope.forbiddenPrinterState = false;

            $scope.closePopover = function () {
                $scope.isPopoverOpen = false;
            };

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
                if (!$scope.allowWhenPrinterIsInState && !$scope.disableWhenPrinterIsInState)
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

            if (!$scope.popoverPlacement) {
                $scope.popoverPlacement = 'top';
            }

            $scope.runAction = function() {
                $scope.isPopoverOpen = false;
                $scope.isActionRunning = true;

                var actionDefer = $scope.action();
                if (actionDefer == null) {
                    $scope.isActionRunning = false;
                } else {
                    actionDefer.then(
                        function success(message) {
                            $scope.actionMessage = message || "ok";
                            $scope.actionSucceded = true;
                                
                            setTimeout(function() {
                                $scope.isPopoverOpen = false;    
                                $scope.$applyAsync();
                            }, 1000);
                        },
                        function error(error) {
                            if (error.error) {
                                error = error.error;
                            }
                            
                            $scope.actionSucceded = false;
                            $scope.actionMessage = error;
                    })
                    .finally(function () {
                        $scope.isActionRunning = false;    
                        $scope.isPopoverOpen = true;
                    });
                }
            }
        }],
        templateUrl: '/partials/directives/actionButton.html'
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

app.directive('titleControl', [function () {
    return {
        scope: {
            backLink: '=?'
        },
        transclude: true,
        controller: ['$scope', '$location', function ($scope, $location) {
            if (!$scope.backLink) {
                // Remove the last page from url
                var pathParts = $location.path().split('/');
                pathParts.pop();
                if (pathParts.length <= 1) {
                    $scope.backLink = '#/';
                } else {
                    $scope.backLink = '#' + pathParts.join('/');
                }
            }
        }],
        templateUrl: '/partials/directives/titleControl.html'
    }
}]);

app.directive('sliderRegulator', [function () {
    return {
        scope: {
            value: '=',
            units: '@',
            min: '@',
            max: '@',
            step: '@',
            leftShifts: '=',
            rightShifts: '='
        },
        controller: ['$scope', function ($scope) {
            var self = this;
            self.min = 0
            self.max = 100;
            self.distance = 100;
            self.step = 0.1;

            $scope.sliderInputId = 'sliderInput' + parseInt(Math.random() * 100000);

            if ($scope.min != null) {
                self.min = parseFloat($scope.min);
            }

            if ($scope.max != null) {
                self.max = parseFloat($scope.max);
            }

            // Slider has bug with click offset when min is not 0.
            // So slider always uses 0 as min. Other min values are emulated.
            self.distance = self.max - self.min;

            if ($scope.step != null) {
                self.step = parseFloat($scope.step);
            }
            
            self.sliderOptions = { 
                floor: self.min, 
                ceil: self.max, 
                step: self.step, 
                precision: 1,
                translate: function(value, sliderId, label) {
                    return value + ' ' + $scope.units;
                }
            };

            self.changeValue = function (delta) {
                delta = parseFloat(delta);
                
                if ($scope.value + delta > self.max) {
                    $scope.value = self.max;
                    return;
                }

                if ($scope.value + delta < self.min) {
                    $scope.value = self.min;
                    return;
                }

                $scope.value = $scope.value + delta;
            };

            $scope.$watch('sliderValue', function(newValue) {
                if (newValue !== undefined) {
                    $scope.value = newValue + self.min;
                }
            });

            $scope.$watch('value', function(newValue) {
                if (newValue !== undefined) {
                    $scope.sliderValue = newValue - self.min;
                }
            });
        }],
        controllerAs: "$ctrl",
        templateUrl: '/partials/directives/sliderRegulator.html'
    }
}]);

app.directive("sliderTargetInput", function () {
    return {
        restrict: 'A',
        priority: -1, // give it lower priority than built-in directives
        link: function(scope, element, attr) {
            scope.$watch(attr.ngModel, function(value) {
                if (value !== undefined) {
                    var event = new Event('keyup');
                    element[0].dispatchEvent(event);
                }
            });
        }
    }
});

app.directive("temperatureChart", function () {
    return {
        scope: {
            series: "=",
            getStartData: "=",
            getDataFromStatus: "=",
            title: '@'
        },
        controller: ['$scope', 'printerStatusService', function ($scope, printerStatusService) {
            var self = this;

            self.temperatureChartLabels = [];
            self.temperatureChartSeries = $scope.series;
            self.title = $scope.title;
            self.isLoading = true;

            self.temperatureChartData = [];
            for (var i = 0; i < self.temperatureChartSeries.length; i++) {
                self.temperatureChartData.push([]);
            }

            var refreshChartByStatus = function (status) {
                var statusData = $scope.getDataFromStatus(status);
                while (self.temperatureChartLabels.length > 30) {
                    self.temperatureChartLabels.shift();
                    for (var i = 0; i < statusData.length; i++) {
                        self.temperatureChartData[i].shift();    
                    }
                }

                // Do not print time to save layout space
                self.temperatureChartLabels.push('');
                for (var i = 0; i < statusData.length; i++) {
                    self.temperatureChartData[i].push(statusData[i]);
                }
            };

            $scope.getStartData().then(function success(data) {
                self.isLoading = false;
                data[0].forEach(function (chartPoint) {
                    // Do not print time to save layout space
                    self.temperatureChartLabels.push('');
                });

                for (var i = 0; i < data.length; i++) {
                    data[i].forEach(function (chartPoint) {
                        self.temperatureChartData[i].push(chartPoint.value);
                    });
                }
            }).then(function success () { // do not update chart until it is loaded
                printerStatusService.eventAggregator.on('statusReceived', refreshChartByStatus);
            });

            $scope.$on('$destroy', function () {
                printerStatusService.eventAggregator.unsubscribe('statusReceived', refreshChartByStatus);
            });
        }],
        controllerAs: "$ctrl",
        templateUrl: '/partials/directives/temperatureChart.html'
    };
})