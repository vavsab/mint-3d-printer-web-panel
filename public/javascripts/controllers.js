app.controller('mainController', ['$scope', 'alertService', 'siteAvailabilityInterceptor', function ($scope, alertService, siteAvailabilityInterceptor) {
    $scope.Header = "Keep Calm Printer Console";
    $scope.alerts = alertService.alerts;
    siteAvailabilityInterceptor.onError = function () {
        alertService.add('danger', 'Site is not available');
    };

    $scope.closeAlert = function (alert) {
        $scope.alerts.forEach(function (value, index) {
            if (value == alert) {
                $scope.alerts.splice(index, 1);
            }
        })
    }

    alertService.eventAggregator.on('alertsChanged', function () {
        $scope.$apply();
    });
}]);

app.controller('dashboardController', ['$scope', '$http', 'printerStatusService', 'commandService', 'alertService', function ($scope, $http, printerStatusService, commandService, alertService) {

    var onStatusReceived = function(status) {
        $scope.status = status;
        $scope.status.timeRemained = $scope.status.remainedMilliseconds;
        $scope.$apply();
    };

    printerStatusService.eventAggregator.on('statusReceived', onStatusReceived);

    var onPrintingEnded = function() {
        alertService.add('success', 'Printing is finished at ' + new Date());
    };
    
    printerStatusService.eventAggregator.on('printingEnded', onPrintingEnded);
    
    $scope.$on("$destroy", function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', onStatusReceived);
        printerStatusService.eventAggregator.unsubscribe('printingEnded', onPrintingEnded);
    });

    $scope.sendCommand = function(commandName, isDirectCommand = false) {
        return commandService.sendCommand(commandName, isDirectCommand);
    }
}]);

app.controller('fileManagerController', ['$scope', 'fileUpload', function ($scope, fileUpload) {
    $scope.isRunning = false;

    $scope.sendFile = function () {
        $scope.isRunning = true;
        $scope.error = null;

        fileUpload.uploadFileToUrl($scope.file, '/api/fileUpload')
            .then(function success() {
                $scope.succeded = true;
            },
            function error(error) {
                $scope.error = error;
            })
            .finally(function () {
                $scope.isRunning = false;
            });
    }
}]);

app.controller('logsController', ['$scope', 'logService', function ($scope, logService) {
    $scope.isLoading = true;

    logService.getFilesInfo()
        .then(
            function success(filesInfo) {
                $scope.filesInfo = filesInfo;
                var totalSize = 0;
                filesInfo.forEach(function (fileInfo) {
                    totalSize += fileInfo.size;
                });

                $scope.totalSize = totalSize;
            },
            function error(error) {
                $scope.error = error;
            }
        )
        .finally(function () {
            $scope.isLoading = false;    
        });
    
    $scope.getFile = function (fileName) {
        $scope.error = undefined;

        logService.getFile(fileName)
            .then(
                function success(fileContent) {},
                function error(error) {
                    $scope.error = error;
                }
            ) 
            .finally(function () {
                $scope.isLoading = false;    
            });
    };
}]);