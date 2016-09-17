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
        $scope.$apply();
    };

    // get current status
    printerStatusService.getStatus()
    .then(function success(status) {
        $scope.status = status;
    });

    printerStatusService.eventAggregator.on('statusReceived', onStatusReceived);

    var onPrintingEnded = function() {
        alertService.add('success', 'Printing is finished at ' + new Date());
    };
    
    printerStatusService.eventAggregator.on('printingEnded', onPrintingEnded);
    
    $scope.$on("$destroy", function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', onStatusReceived);
        printerStatusService.eventAggregator.unsubscribe('printingEnded', onPrintingEnded);
    });

    $scope.sendCommand = function(commandName, isDirectCommand) {
        isDirectCommand = isDirectCommand === undefined ? false : isDirectCommand;
        return commandService.sendCommand(commandName, isDirectCommand);
    }
}]);

app.controller('fileManagerController', ['$scope', 'fileService', function ($scope, fileService) {
    $scope.isRunning = false;

    $scope.sendFile = function () {
        $scope.isRunning = true;
        $scope.error = null;

        fileService.uploadFileToDirectory($scope.file, convertPathToString())
            .then(function success() {
                $scope.succeded = true;
                refreshPath();
            },
            function error(error) {
                $scope.error = error;
            })
            .finally(function () {
                $scope.isRunning = false;
            });
    }

    var convertPathToString = function () {
        var pathString = '/';
        $scope.currentPath.forEach(function (item) {
            pathString += item + '/';
        });

        return pathString;
    };

    var refreshPath = function () {
        $scope.isFolderLoading = true;

        fileService.getFolderContents(convertPathToString())
        .then(function success (folderContents) {
            if ($scope.currentPath.length != 0) {
                folderContents.unshift({ 
                    fileName: '..',
                    isDirectory: true,
                    size: 0
                });
            }

            $scope.currentFolderContents = folderContents
        },
        function error(error) {
            $scope.folderLoadingError = error;
        })
        .finally(function () {
            $scope.isFolderLoading = false;
        });
    }

    $scope.currentPath = [];
    refreshPath();

    $scope.goToFolder = function (folderName) {
        if (folderName == '..') {
            // go up
            $scope.currentPath.pop();
        } else  {
            $scope.currentPath.push(folderName);
        }

        refreshPath();
    };

    $scope.goToPathIndex = function (index) {
        while ($scope.currentPath.length > index) {
            $scope.currentPath.pop();
        }

        refreshPath();
    };

    $scope.removeFile = function (fileName) {
        if (confirm("Are you sure to remove '" + fileName + "'?")) {
            fileService.removeFile(convertPathToString() + fileName)
            .then(function success() {
                refreshPath();
            },
            function error(error) {
                $scope.folderLoadingError = error;
            });
        }
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