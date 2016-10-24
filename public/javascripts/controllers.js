app.controller('mainController', 
['$scope', 'alertService', 'siteAvailabilityInterceptor', 'printerStatusService', 'commandService', '$q', 'dialogService',
function ($scope, alertService, siteAvailabilityInterceptor, printerStatusService, commandService, $q, dialogService) {
    $scope.Header = "Keep Calm Printer Console";
    $scope.alerts = alertService.alerts;
    siteAvailabilityInterceptor.onError = function () {
        alertService.add('danger', 'Site is not available');
    };

    $scope.isMinimized = false;

    $scope.removeAllAlerts = function () {
        while ($scope.alerts.length) {
            $scope.alerts.pop();
        }
    };

    $scope.removeAlert = function (alert) {
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

app.controller('dashboardController', ['$scope', 'commandService', 'alertService', 'macrosService', '$uibModal', 'websiteSettingsService', 
function ($scope, commandService, alertService, macrosService, $uibModal, websiteSettingsService) {
    
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

    var macrosResource = macrosService.getMacrosResource();
    macrosResource.query().$promise.then(
    function success(macroses) {
        websiteSettingsService.get().then(function success(settings) {
            $scope.macroses = [];
            settings.dashboardMacrosIds.forEach(function (macroId) {
                for (var i = 0; i < macroses.length; i++) {
                    if (macroses[i].id == macroId) {
                        $scope.macroses.push(macroses[i]);
                        break;
                    }
                }
            });
        });
    });

    $scope.runMacros = function (macros) {
        var modalInstance = $uibModal.open({
            templateUrl: '/partials/dialogs/runMacrosDialog.html',
            controller: 'runMacrosDialogController',
            controllerAs: '$ctrl',
            resolve: {
                macros: function () {
                    return macros;
                }
            }
        });

        return modalInstance.result;
    };
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

app.controller('macrosController', 
['$scope', 'dialogService', 'macrosService', '$q', 'commandService', 'localStorageService', 
function ($scope, dialogService, macrosService, $q, commandService, localStorageService) {
    var macrosResource = macrosService.getMacrosResource();
    var maxIndex;
    $scope.selectedMacro = null;
    $scope.isLoading = true;

    $scope.selectMacro = function (macro) {
        $scope.selectedMacro = macro;
        $scope.values = null;
        if (localStorageService.isSupported) {
            $scope.values = localStorageService.get("macroParams" + macro.id);
        } 
        
        if (!$scope.values) {
            $scope.values = {};
        }
    };

    macrosResource.query().$promise.then(
    function success(data) {
        $scope.macros = data;
        maxIndex = -1;
        if ($scope.macros.length > 0) {
            $scope.selectMacro($scope.macros[0]);
        } else {
            $scope.selectMacro(null);
        }
        
        $scope.macros.forEach(function (item) {
            if (item.id > maxIndex) {
                maxIndex = item.id;
            }
        });
    },
    function error(error) {
        $scope.error = 'Error while page loading: ' + error;
    })
    .finally(function () {
        $scope.isLoading = false;
    });

    $scope.remove = function () {
        if ($scope.selectedMacro == null)
            return;

        return $q(function (resolve, reject) {
        dialogService.confirm("Are you sure to remove '" + $scope.selectedMacro.title + "'?", 'Confirm removal').then(
            function success() {
                $scope.selectedMacro.$delete().then(
                function success() {
                    $scope.macros.splice($scope.macros.indexOf($scope.selectedMacro), 1);
                    if ($scope.macros.length > 0) {
                        $scope.selectMacro($scope.macros[0]);
                    } else {
                        $scope.selectMacro(null);
                    }

                    resolve();
                },
                function error(response) {
                    reject(response.error);
                });
            },
            function error (error) {
                reject(error);
            });
        });
    };

    $scope.run = function () {
        if ($scope.selectedMacro == null)
            return;

        return $q(function (resolve, reject) {
            macrosService.run($scope.selectedMacro, $scope.values).then(
                function success() {
                    if (localStorageService.isSupported) {
                        localStorageService.set("macroParams" + $scope.selectedMacro.id, $scope.values);
                    }

                    resolve();
                },
                function error(error) {
                    reject(error);
                }
            );
        });
    };

    $scope.save = function () {
        if ($scope.selectedMacro == null)
            return;

        return $scope.selectedMacro.$save();
    };

    $scope.addParameter = function () {
        var paramNo = $scope.selectedMacro.parameters.length + 1;
        $scope.selectedMacro.parameters.push({"name": "param" + paramNo, "title": "param title" + paramNo});
    };

    $scope.removeParameter = function (param) {
        console.log(param);
        $scope.selectedMacro.parameters.splice($scope.selectedMacro.parameters.indexOf(param), 1);
    };

    $scope.create = function () {
        dialogService.prompt("Specify macros name", 'New macros').then(
        function success(name) {
            maxIndex++;
            var newMacros = new macrosResource({id: maxIndex, title: name, content: '', isReadOnly: false, parameters: []});
            $scope.selectedMacro = newMacros;
            $scope.macros.push(newMacros);
        });
    }
}]);

app.controller('settingsPrinterController', 
['$scope', 'printerSettingsService', 'commandService',
function ($scope, printerSettingsService, commandService) {
    $scope.settings = null;
    $scope.offset = { z: 0 };
    $scope.isLoading = true;

    $scope.displaySettings = [
        { title: "L", tag: "L", comment: "mm * 10^-5" },
        { title: "Height", tag: "H", comment: "mm * 10^-5" },
        { title: "Zero Height", tag: "Z", comment: "mm * 10^-5" },
        { title: "Tower0 Qx", tag: "Tx0", comment: "mm * 10^-5" },
        { title: "Tower0 Qy", tag: "Ty0", comment: "mm * 10^-5" },
        { title: "Tower1 Qx", tag: "Tx1", comment: "mm * 10^-5" },
        { title: "Tower1 Qy", tag: "Ty1", comment: "mm * 10^-5" },
        { title: "Tower2 Qx", tag: "Tx2", comment: "mm * 10^-5" },
        { title: "Tower2 Qy", tag: "Ty2", comment: "mm * 10^-5" },
        { title: "Tower0 Calibration", tag: "T0C", comment: "mm * 10^-5" },
        { title: "Tower1 Calibration", tag: "T1C", comment: "mm * 10^-5" },
        { title: "Tower2 Calibration", tag: "T2C", comment: "mm * 10^-5" },
        { title: "Acceleration", tag: "A", comment: "mm * 10^-5" }
    ];

    var refresh = function () {
        $scope.loading = true;
        printerSettingsService.get().then(
        function success(data) {
            $scope.settings = data;
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
        return printerSettingsService.save($scope.settings);
    }

    $scope.saveOffset = function () {
        $scope.settings.Z = parseInt($scope.settings.Z) + Math.round(parseFloat($scope.offset.z) * 100000);
        var promise = printerSettingsService.save($scope.settings);
        return promise.then(function success() {
            $scope.offset.z = 0;
        });
    }

    $scope.reset = function() {
        return printerSettingsService.reset().then(function success() { 
            refresh();
        });
    };

    $scope.moveHome = function () {
        return commandService.sendCommand('G28'); 
    };

    $scope.test = function () {
        return commandService.sendCommand("G1 Z" + $scope.offset.z.toFixed(3) + " F3000");
    }
}]);

app.controller('settingsDashboardController', 
['$scope', 'websiteSettingsService', 'macrosService',
function ($scope, websiteSettingsService, macrosService) {

    $scope.dashboardMacroses = [];
    $scope.selectedMacroses = [];
    $scope.selectedDashboardMacroses = [];
    var websiteSettings = null;
    var macrosResource = macrosService.getMacrosResource();
    macrosResource.query().$promise.then(
    function success(data) {
        $scope.macroses = data;
        
        return websiteSettingsService.get().then(function success(settings) {
            websiteSettings = settings;
            websiteSettings.dashboardMacrosIds.forEach(function (macrosId) {
                var macrosToMoveIndex = null;
                for (var i = 0; i < $scope.macroses.length; i++) {
                    if ($scope.macroses[i].id == macrosId) {
                        macrosToMoveIndex = i;
                        break;
                    }
                }

                if (macrosToMoveIndex != null) {
                    $scope.dashboardMacroses.push($scope.macroses.splice(macrosToMoveIndex, 1)[0]);
                }    
            });
        });
    },
    function error(error) {
        $scope.error = 'Error while page loading: ' + error;
    });

    $scope.moveToDashboard = function (macroses) {
        macroses.forEach(function (macros) {
            var index = $scope.macroses.indexOf(macros);
            $scope.dashboardMacroses.push($scope.macroses.splice(index, 1)[0]);
        });
    };

    $scope.removeFromDashboard = function (macroses) {
        macroses.forEach(function (macros) {
            var index = $scope.dashboardMacroses.indexOf(macros);
            $scope.macroses.push($scope.dashboardMacroses.splice(index, 1)[0]);
        });
    };

    $scope.moveDashboardMacrosUp = function (macros) {
        var index = $scope.dashboardMacroses.indexOf(macros);
        if (index - 1 >= 0) {
            var tmp = $scope.dashboardMacroses[index - 1];
            $scope.dashboardMacroses[index - 1] = $scope.dashboardMacroses[index];
            $scope.dashboardMacroses[index] = tmp;
        }
    };

    $scope.moveDashboardMacrosDown = function (macros) {
        var index = $scope.dashboardMacroses.indexOf(macros);
        if (index + 1 < $scope.dashboardMacroses.length) {
            var tmp = $scope.dashboardMacroses[index + 1];
            $scope.dashboardMacroses[index + 1] = $scope.dashboardMacroses[index];
            $scope.dashboardMacroses[index] = tmp;
        }
    };

    $scope.saveMacrosSettings = function () {
        var macrosIds = [];
        $scope.dashboardMacroses.forEach(function (macros) {
            macrosIds.push(macros.id);
        });

        websiteSettings.dashboardMacrosIds = macrosIds;

        return websiteSettingsService.save(websiteSettings);
    };
}]);