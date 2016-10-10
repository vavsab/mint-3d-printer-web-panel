﻿app.controller('mainController', ['$scope', 'alertService', 'siteAvailabilityInterceptor', 'printerStatusService', 'commandService', '$q', 'dialogService',
function ($scope, alertService, siteAvailabilityInterceptor, printerStatusService, commandService, $q, dialogService) {
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
        var time = new Date().toLocaleTimeString();
        if (Notification.permission == 'granted') {
            new Notification('Printing is finished', { body: 'Finished at ' + time, icon: '/images/notification-done.png' })
        }
        
        alertService.add('success', 'Printing was finished at ' + time);
    };
    
    printerStatusService.eventAggregator.on('printingEnded', onPrintingEnded);
    
    $scope.$on("$destroy", function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', onStatusReceived);
        printerStatusService.eventAggregator.unsubscribe('printingEnded', onPrintingEnded);
    });

    $scope.emergencyStop = function () {
        return $q(function (resolve, reject) {
            dialogService.confirm("Are you sure to stop printing?", 'Emergency stop').then(
            function success () {
                commandService.sendCommand("stop").then(
                function success () {
                    resolve();
                },
                function error (error) {
                    reject(error);
                });
            },
            function error () {
                reject('cancelled');
            });
        });
    };

    if (Notification.permission == "default") {
        Notification.requestPermission();
    } 
}]);

app.controller('dashboardController', ['$scope', 'commandService', 'alertService', 
function ($scope, commandService, alertService) {

    $scope.commands = [
        { title: 'Home', command: 'G28' },
        { title: 'Temperature to zero', command: 'M104 S0' }, 
        { title: 'Temperature to 205', command: 'M104 S205' },
        { title: 'Fan On', command: 'M106 S255' },
        { title: 'Fan Off', command: 'M106 S0' },
        { title: 'Reset values', command: 'M206 S0' }
    ];

    $scope.setCommand = function (command) {
        $scope.command = command;
    };

    $scope.sendCommand = function(command) {
        return commandService.sendCommand(command);
    }
}]);

app.controller('fileManagerController', ['$scope', 'fileService', '$q', 'commandService', '$uibModal', 'dialogService', 'Upload',
function ($scope, fileService, $q, commandService, $uibModal, dialogService, Upload) {
    $scope.isRunning = false;
    $scope.uploadProgress = 0;

    $scope.sendFile = function () {
        $scope.isUploading = true;
        $scope.error = null;

        fileService.uploadFileToDirectory($scope.file, convertPathToString())
            .then(function success() {
                refreshPath();
            },
            function error(error) {
                $scope.error = error;
            },
            function notify(notification) {
                $scope.uploadProgress = 100.0 * notification.loaded / notification.total;
            })
            .finally(function () {
                $scope.isUploading = false;
                $scope.uploadProgress = 0;
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

    $scope.remove = function (file) {
        return $q(function (resolve, reject) {
            dialogService.confirm("Are you sure to remove '" + file.fileName + "'?", 'Confirm removal').then(
            function success () {
                fileService.remove(convertPathToString() + file.fileName)
                .then(function success() {
                    resolve();
                    refreshPath();
                },
                function error(error) {
                    reject(error);
                })
            },
            function error () {
                reject('cancelled');
            });
        });
    };

    $scope.createDirectory = function () {
        return $q(function (resolve, reject) {
            dialogService.prompt("Specify folder name", 'New folder').then(
            function success (folderName) {
                if (folderName == null) {
                    reject('Folder name is empty');
                } else {
                    fileService.createDirectory(folderName, convertPathToString()).then(
                    function success() {
                        resolve();
                        refreshPath();
                    },
                    function error(error) {
                        reject(error); 
                    });
                }
            },
            function error () {
                reject('cancelled');
            });
        });
    };

    $scope.startPrint = function (fileName, withBuffer) {
        return $q(function (resolve, reject) {
            if ($scope.status.isPrint) {
                reject('Printer is busy now');
            } else {
                return commandService.sendCommand((withBuffer ? 'startb ' : 'start ') + convertPathToString() + fileName)
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
            templateUrl: '/partials/dialogs/analyseDialog.html',
            controller: 'analyseDialogController',
            controllerAs: '$ctrl',
            resolve: {
                path: function () {
                    return convertPathToString() + fileName;
                }
            }
        });
    };
}]);

app.controller('logsController', ['$scope', 'logService', 'dialogService', '$q',
function ($scope, logService, dialogService, $q) {
    $scope.isLoading = true;

    var refreshLogs = function () {
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
    };

    refreshLogs();
    
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

    $scope.remove = function (fileName) {
        return $q(function (resolve, reject) {
            dialogService.confirm("Are you sure to remove '" + fileName + "'?", 'Confirm removal').then(
            function success () {
                logService.remove(fileName)
                .then(function success() {
                    resolve();
                    refreshLogs();
                },
                function error(error) {
                    reject(error);
                })
            },
            function error () {
                reject('cancelled');
            });
        });
    };
}]);

app.controller('macrosController', ['$scope', 'dialogService', 'macrosService', '$q', 'commandService', function ($scope, dialogService, macrosService, $q, commandService) {
    var macrosResource = macrosService.getMacrosResource();
    var maxIndex;
    $scope.selectedMacro = null;

    $scope.console = [{ type: 'default', time: new Date(), content: 'Loading contents...'}];

    macrosResource.query().$promise.then(
    function success(data) {
        $scope.macros = data;
        maxIndex = -1;
        $scope.macros.forEach(function (item) {
            if (item.id > maxIndex) {
                maxIndex = item.id;
            }
        });

        $scope.console.push({ type: 'success', time: new Date(), content: 'Page loaded'})
    },
    function error(error) {
        $scope.console.push({ type: 'error', time: new Date(), content: 'Error while page loading: ' + error})
    });

    $scope.selectMacro = function (macro) {
        $scope.selectedMacro = macro;
    }

    $scope.remove = function () {
        if ($scope.selectedMacro == null)
            return;

        dialogService.confirm("Are you sure to remove '" + $scope.selectedMacro.title + "'?", 'Confirm removal').then(
            function success() {
                return $q(function (resolve, reject) {
                    $scope.selectedMacro.$delete().then(
                    function success() {
                        $scope.macros.splice($scope.macros.indexOf($scope.selectedMacro));
                        resolve();
                    },
                    function error(response) {
                        $scope.console.push({ type: 'error', time: new Date(), content: 'Error while removing macros: ' + response.status})
                        reject();
                    });
                });
            }
        );
    };

    $scope.run = function () {
        if ($scope.selectedMacro == null)
            return;

        return $q(function (resolve, reject) {
            var macros = $scope.selectedMacro;
            var lines = macros.content.split(/\n/);
            var lineIndex = 0;

            var sendNextLine = function () {
                if (lineIndex >= lines.length) {
                    $scope.console.push({ type: 'success', time: new Date(), content: 'Macros "' + macros.title + '" is finished'});
                    resolve();
                }
                
                commandService.sendCommand(lines[lineIndex]).then(
                function success() {
                    $scope.console.push({ type: 'success', time: new Date(), content: lines[lineIndex]});
                    lineIndex++;
                    sendNextLine();
                },
                function error(error) {
                    $scope.console.push({ type: 'error', time: new Date(), content: error});
                    reject(error);
                });
            };
        });
    };

    $scope.save = function () {
        if ($scope.selectedMacro == null)
            return;

        return $scope.selectedMacro.$save();
    };

    $scope.create = function () {
        dialogService.prompt("Specify macros name", 'New macros').then(
        function success(name) {
            maxIndex++;
            $scope.macros.push(new macrosResource({id: maxIndex, title: name, content: ''}));
        });
    }
}]);

app.controller('settingsController', ['$scope', 'settingsService', 'commandService', '$q', 
function ($scope, settingsService, commandService, $q) {
    $scope.settings = null;
    $scope.zOffset = 0;
    $scope.isLoading = true;

    $scope.displaySettings = [
        { title: "L", tag: "L", comment: "mm * 10^-5" },
        { title: "Height", tag: "H", comment: "mm * 10^-5" },
        { title: "ZeroHeight", tag: "Z", comment: "mm * 10^-5" },
        { title: "Tower0Qx", tag: "Tx0", comment: "mm * 10^-5" },
        { title: "Tower0Qy", tag: "Ty0", comment: "mm * 10^-5" },
        { title: "Tower1Qx", tag: "Tx1", comment: "mm * 10^-5" },
        { title: "Tower1Qy", tag: "Ty1", comment: "mm * 10^-5" },
        { title: "Tower2Qx", tag: "Tx2", comment: "mm * 10^-5" },
        { title: "Tower2Qy", tag: "Ty2", comment: "mm * 10^-5" },
        { title: "Tower0Calibr", tag: "T0C", comment: "mm * 10^-5" },
        { title: "Tower1Calibr", tag: "T1C", comment: "mm * 10^-5" },
        { title: "Tower2Calibr", tag: "T2C", comment: "mm * 10^-5" },
        { title: "Aceleration", tag: "A", comment: "mm * 10^-5" }
    ];

    var refresh = function () {
        $scope.loading = true;
        settingsService.get().then(
        function success(response) {
            $scope.settings = response.data;
        },
        function error(error) {
            $scope.error = "Error while loading: " + error;
        })
        .finally(function () {
            $scope.isLoading = false;
        });
    };
    
    refresh();

    $scope.save = function () {
        return settingsService.save($scope.settings);
    }

    $scope.saveOffset = function () {
        $scope.settings.Z += Math.round(parseFloat($scope.zOffset) * 100000);
        var promise = settingsService.save($scope.settings);
        return promise.then(function success() {
            $scope.zOffset = 0;
        });
    }

    $scope.reset = function() {
        return $q(function (resolve, reject) {
            settingsService.reset().then(
            function success() { 
                refresh();
                resolve();
            },
            function error(error){
                reject(error);
            });
        });
    };

    $scope.moveHome = function () {
        return commandService.sendCommand('G28'); 
    };

    $scope.test = function () {
        return commandService.sendCommand("G1 Z" + $scope.zOffset + " F3000");
    }
}]);