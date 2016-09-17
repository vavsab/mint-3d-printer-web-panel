app.controller('mainController', ['$scope', 'alertService', 'siteAvailabilityInterceptor', 'printerStatusService', 'commandService', '$q',
function ($scope, alertService, siteAvailabilityInterceptor, printerStatusService, commandService, $q) {
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

    $scope.emergencyStop = function () {
        if (confirm("Are you sure to stop printing?")) {
            return commandService.sendCommand("stop");
        } else {
            return $q(function (resolve, reject) {
                reject('cancelled');
            });
        }
    };
}]);

app.controller('dashboardController', ['$scope', '$http', 'commandService', 'alertService', 
function ($scope, $http, commandService, alertService) {
    $scope.sendCommand = function(command) {
        return commandService.sendCommand(command);
    }
}]);

app.controller('fileManagerController', ['$scope', 'fileService', '$q', 'commandService', '$uibModal', 
function ($scope, fileService, $q, commandService, $uibModal) {
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
        return $q(function (resolve, reject) {
            if (confirm("Are you sure to remove '" + fileName + "'?")) {
                fileService.removeFile(convertPathToString() + fileName)
                .then(function success() {
                    resolve();
                    refreshPath();
                },
                function error(error) {
                    reject(error);
                });
            } else {
                reject('cancelled');
            }
        });
    };

    $scope.startPrint = function (fileName) {
        return $q(function (resolve, reject) {
            if ($scope.status.isPrint) {
                reject('Printer is busy now');
            } else {
                return commandService.sendCommand('start ' + convertPathToString() + fileName)
                .then(function success() {
                    resolve();
                },
                function error(error) {
                    reject(error);
                });
            }
        });
    };

    $scope.analyseFile = function (fileName) {
        var modalInstance = $uibModal.open({
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'analyseModal.html',
            controller: 'fileManagerAnalyseFileController',
            controllerAs: '$ctrl',
            resolve: {
                fileName: function () {
                    return fileName;
                }
            }
        });
    };
}]);

app.controller('fileManagerAnalyseFileController', ['$uibModalInstance', '$scope', 'fileName', 
function ($uibModalInstance, $scope, fileName) { 
    var $ctrl = this;

    $ctrl.ok = function () {
        $uibModalInstance.close();
    };
}]);

app.controller('logsController', ['$scope', 'logService', 
function ($scope, logService) {
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