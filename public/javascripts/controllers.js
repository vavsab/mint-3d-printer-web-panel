app.controller("themeController", ['browserSettings', function (browserSettings) {
    this.browserSettings = browserSettings;
}]);

app.controller('mainController', 
['$scope', 'alertService', 'siteAvailabilityInterceptor', 'printerStatusService', 
    'commandService', '$q', 'dialogService', 'loader', 'localStorageService', 'browserSettings',
    'websiteSettings', 'websiteSettingsService', 'fileService', '$window', 'shutdownService', 
    'printerStatus', '$location', 'tokenErrorInterceptor', '$cookies',
function ($scope, alertService, siteAvailabilityInterceptor, printerStatusService, 
    commandService, $q, dialogService, loader, localStorageService, browserSettings,
    websiteSettings, websiteSettingsService, fileService, $window, shutdownService,
    printerStatus, $location, tokenErrorInterceptor, $cookies) {
    var self = this;
    this.websiteSettings = websiteSettings;
    $scope.loader = loader;
    $scope.show = false;

    this.play2048 = function () {
        dialogService.play2048();
    };

    this.printerStatus = printerStatus;

    this.lock = function () {
        self.printerStatus.isLocked = true;
        $cookies.remove('token');
        $location.path('/lockScreen');
    }

    $scope.alerts = alertService.alerts;

    siteAvailabilityInterceptor.onError = function () {
        alertService.add('danger', 'Site is not available');
    };

    tokenErrorInterceptor.onError = function () {
        $location.path('/lockScreen');
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
        $scope.$applyAsync();
        printerStatus.status = status;
    };

        // get current status
    printerStatusService.getStatus()
    .then(function success(status) {
        onStatusReceived(status);
    });

    printerStatusService.eventAggregator.on('statusReceived', onStatusReceived);

    var onPrintingEnded = function() {
        var time = new Date().toLocaleTimeString();
        if (window.Notification != null && Notification != null && Notification.permission == 'granted') {
            new Notification('Printing is finished', { body: 'Finished at ' + time, icon: '/images/notification-done.png' })
        }
        
        alertService.add('success', 'Printing was finished at ' + time);
    };
    
    printerStatusService.eventAggregator.on('printingEnded', onPrintingEnded);
    
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
                resolve('cancelled');
            });
        });
    };
    
    if (window.Notification != null && Notification.permission == "default") {
        Notification.requestPermission();
    } 

    if (localStorageService.isSupported) {
        browserSettings.showVirtualKeyboard = localStorageService.get('showVirtualKeyboard');
        browserSettings.isDarkTheme = localStorageService.get('isDarkTheme');
    }

    websiteSettingsService.get().then(function success(settings) { 
        websiteSettings.settings = settings;
        document.title = settings.printerName + " Console";
    });

    var refreshDiskspace = function (diskspace) {
        $scope.diskspace = diskspace;
        $scope.$applyAsync();
    };

    this.reload = function () {
        $window.location.reload();
    }

    this.shutdown = function () {
        dialogService.confirm('Are you sure to shutdown?').then(function () {
            shutdownService.shutdown().catch(function (error) {
                alertService.add('danger', 'Shutdown failed: ' + error);
            });
        });
    }

    fileService.eventAggregator.on('diskspace', refreshDiskspace);

    $scope.$on('$destroy', function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', onStatusReceived);
        printerStatusService.eventAggregator.unsubscribe('printingEnded', onPrintingEnded);
        fileService.eventAggregator.unsubscribe('diskspace', refreshDiskspace);
    });

    loader.show = false;

    $scope.go = function (path) {
        $location.path(path);
    };
}]);

app.controller('lockScreenController', 
['printerStatus', '$location', 'websiteSettings', '$cookies', 'tokenService', 'loader',
function (printerStatus, $location, websiteSettings, $cookies, tokenService, loader) {
    var self = this;
    printerStatus.isLocked = true;
    this.printerStatus = printerStatus;
    this.websiteSettings = websiteSettings;
    this.showPasswordInput = false;
    this.password = null;
    this.error = null;
        
    this.tryEnter = function(type) {
        if (type == 'click' && self.showPasswordInput) {
            return;
        }

        loader.show = true;
        var password = self.showPasswordInput ? self.password : null;

        tokenService.get(password).then(function success(response) {
            $cookies.put('token', response.token);
            self.printerStatus.isLocked = false;
            $location.path('/');
        }, function error(response) {
            if (self.showPasswordInput) {   
                self.error = response.error;
            } else {
                self.showPasswordInput = true;
            }
        }).finally(function () { 
            loader.show = false;
        });
    }

    if ($cookies.get('token')) {
        self.tryEnter();
    }
}]);

app.controller('dashboardController', [function () {
}]);

app.controller('fileManagerController', 
['$scope', 'fileService', '$q', 'commandService', '$uibModal', 'dialogService', 'Upload', 'websiteSettings',
function ($scope, fileService, $q, commandService, $uibModal, dialogService, Upload, websiteSettings) {

    $scope.isRunning = false;
    $scope.uploadProgress = 0;
    $scope.websiteSettings = websiteSettings;

    $scope.sendFile = function () {
        if (!$scope.file)
            return;

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
        $scope.fileFilter = {};
        $scope.isFolderLoading = true;

        fileService.getFolderContents(convertPathToString())
        .then(function success (folderContents) {
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
                resolve("cancelled");
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
                resolve('cancelled');
            });
        });
    };

    $scope.startPrint = function (fileName, withBuffer) {
        return $q(function (resolve, reject) {
            if ($scope.status.state !== 'Idle') {
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

app.controller('printerLogsController', ['$scope', 'logService', function ($scope, logService) {
    var self = this;
    self.isLoading = true;

    var refresh = function () {
        logService.getPrinterErrors().then(function success(errors) {
            self.isLoading = false;
            self.printerErrors = errors.reverse();
        });
    }

    refresh();
    var intervalId = setInterval(refresh, 1000);

    $scope.$on("$destroy", function () {
        clearInterval(intervalId);
    })
}]);

app.controller('logsController', ['logService', 'dialogService', '$q',
function (logService, dialogService, $q) {
    var self = this;
    self.isLoading = true;

    var refreshLogs = function () {
        self.isLoading = true;
        logService.getFilesInfo()
        .then(
            function success(filesInfo) {
                self.filesInfo = filesInfo;
                var totalSize = 0;
                filesInfo.forEach(function (fileInfo) {
                    totalSize += fileInfo.size;
                });

                self.totalSize = totalSize;
            },
            function error(error) {
                self.error = error;
            }
        )
        .finally(function () {
            self.isLoading = false;    
        });
    };

    refreshLogs();
    
    self.getFile = function (fileName) {
        self.error = undefined;

        logService.getFile(fileName)
            .then(
                function success(fileContent) {},
                function error(error) {
                    self.error = error;
                }
            ) 
            .finally(function () {
                self.isLoading = false;    
            });
    };

    self.remove = function (fileName) {
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
                resolve('cancelled');
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
    $scope.statesInfo = [
        {state: 'Idle', title: 'Idle', isAllowed: true},
        {state: 'CopyData', title: 'Data copy', isAllowed: true},
        {state: 'CopyDataBuffer', title: 'Data copy (with buffer)', isAllowed: true},
        {state: 'Buffering', title: 'Buffering', isAllowed: true},
        {state: 'PrintBuffering', title: 'Printing (with buffer)', isAllowed: true},
        {state: 'Printing', title: 'Printing', isAllowed: true},
        {state: 'Pause', title: 'Pause', isAllowed: true},
        {state: 'PauseBuffering', title: 'Pause (printing with buffer)', isAllowed: true},
        {state: 'PausePrintBuffering', title: 'Pause (buffering)', isAllowed: true}
    ];

    $scope.selectMacro = function (macro) {
        $scope.selectedMacro = macro;

        if (macro.restrictedStates == null) {
            macro.restrictedStates = [];
        }

        $scope.statesInfo.forEach(function (stateInfo) {
            stateInfo.isAllowed = macro.restrictedStates.indexOf(stateInfo.state) == -1;
        });

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
                resolve('cancelled');
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

        $scope.selectedMacro.restrictedStates = [];
        $scope.statesInfo.forEach(function (stateInfo) {
            if (!stateInfo.isAllowed) {
                $scope.selectedMacro.restrictedStates.push(stateInfo.state);
            }
        });

        return $q(function (resolve, reject) {
            $scope.selectedMacro.$save().then(
                function success() { 
                    resolve(); 
                }, 
                function error(message) {
                    reject(message);
                })
        });
    };

    $scope.addParameter = function () {
        var paramNo = $scope.selectedMacro.parameters.length + 1;
        $scope.selectedMacro.parameters.push({"name": "param" + paramNo, "title": "param title" + paramNo});
    };

    $scope.removeParameter = function (param) {
        $scope.selectedMacro.parameters.splice($scope.selectedMacro.parameters.indexOf(param), 1);
    };

    $scope.create = function () {
        dialogService.prompt("Specify macros name", 'New macros').then(
        function success(name) {
            maxIndex++;
            var newMacros = new macrosResource({id: maxIndex, title: name, content: '', isReadOnly: false, parameters: [], restrictedStates: []});
            $scope.selectedMacro = newMacros;
            $scope.macros.push(newMacros);
        });
    };
}]);

app.controller('settingsPrinterExtruderController', 
['printerSettingsService', 'commandService', 'loader', '$q',
function (printerSettingsService, commandService, loader, $q) {
    var self = this;

    this.extruderPosition = 0;
    this.actualExtruderPosition = 0;

    var refresh = function () {
        loader.show = true;
        printerSettingsService.get().then(
        function success(data) {
            self.settings = data;
        },
        function error(error) {
            self.error = "Error while loading: " + error;
        })
        .finally(function () {
            loader.show = false;
        });
    };
    
    refresh();

    this.resetExtruderPosition = function () {
        return commandService.sendCommand("G92 E0").then(function () { 
            self.extruderPosition = 0; 
            self.actualExtruderPosition = 0; 
        });
    };

    this.extrude = function () {
        return commandService.sendCommand("G1 E" + self.extruderPosition);
    };

    this.resetOverExtrusion = function () {
        return commandService.sendCommand("M221 S100");
    };

    this.recalculateOverExtrusion = function () {
        return commandService.sendCommand("M221 S" + parseInt(self.extruderPosition * 100 / self.actualExtruderPosition));
    };

    this.applyOverExtrusion = function () {
        if (self.status == null || self.status.extrOver == null) {
            return $q(function (resolve, reject) {
                reject("Has no extruder status received from printer. Cannot apply settings.");
            });
        }

        var delayKey = "E1DelayIntervalToSpeed";
        var tickKey = "E1TickPerM";

        var overExtrusion = self.status.extrOver;
        var latestOverExtrusion = 100;

        var delay = self.settings[delayKey];

        delay = delay * latestOverExtrusion;
        delay = delay / overExtrusion;
        delay = parseInt(delay*10);

        var tick = self.settings[tickKey];
        tick = tick / latestOverExtrusion;
        tick = tick * overExtrusion;
        tick = parseInt(tick/10);

        self.settings[delayKey] = delay;
        self.settings[tickKey] = tick;

        return printerSettingsService.save(self.settings).then(commandService.sendCommand("M221 S100"));
    };
}]);

app.controller('settingsPrinterZIndexController', 
['printerSettingsService', 'commandService', 'loader',
function (printerSettingsService, commandService, loader) {
    var self = this;

    this.settings = null;
    this.offset = { z: 0 };

    var refresh = function () {
        loader.show = true;
        printerSettingsService.get().then(
        function success(data) {
            self.settings = data;
        },
        function error(error) {
            self.error = "Error while loading: " + error;
        })
        .finally(function () {
            loader.show = false;
        });
    };
    
    refresh();

    this.saveOffset = function () {
        self.settings.Z = parseInt(self.settings.Z) + Math.round(parseFloat(self.offset.z) * 100000);
        var promise = printerSettingsService.save(self.settings);
        return promise.then(function success() {
            self.offset.z = 0;
        });
    }

    this.moveHome = function () {
        return commandService.sendCommand('G28'); 
    };

    this.test = function () {
        return commandService.sendCommand("G1 Z" + self.offset.z.toFixed(3) + " F3000");
    }
}]);

app.controller('settingsPrinterAdvancedController', 
['$scope', 'printerSettingsService', 'printerStatusService', 'dialogService',
function ($scope, printerSettingsService, printerStatusService, dialogService) {
    var self = this;

    this.temperatureChartLabels = [];
    this.temperatureChartSeries = ['Temperature', 'Base temperature'];
    
    // 0 seria - temperature, 1 seria - base temperature
    this.temperatureChartData = [[],[]];

    var refreshChartByStatus = function (status) {
        while (self.temperatureChartLabels.length > 30) {
            self.temperatureChartLabels.shift();
            self.temperatureChartData[0].shift();
            self.temperatureChartData[1].shift();      
        }

        self.temperatureChartLabels.push(new Date(status.date).getSeconds());
        self.temperatureChartData[0].push(status.temp / 10);
        self.temperatureChartData[1].push(status.baseTemp / 10);
    }

    printerStatusService.getTemperatureChartData().then(function success(temperatureData) {
        temperatureData.temp.forEach(function (chartPoint) {
             self.temperatureChartLabels.push(new Date(chartPoint.date).toLocaleTimeString());
             self.temperatureChartData[0].push(chartPoint.value / 10);
        });

        temperatureData.baseTemp.forEach(function (chartPoint) {
            self.temperatureChartData[1].push(chartPoint.value / 10);
        });
    }).then(function success () { // do not update chart until it is loaded
        printerStatusService.eventAggregator.on('statusReceived', refreshChartByStatus);
    });

    this.settings = null;
    this.offset = { z: 0 };
    this.isLoading = true;

    this.displaySettings = [
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
        { title: "Acceleration", tag: "A", comment: "mm * 10^-5" },
        { title: "Heater 1. Kp", tag: "H1Kp", comment: "constant" },
        { title: "Heater 1. Kdd", tag: "H1Kdd", comment: "constant" },
        { title: "Heater 1. Kid", tag: "H1Kid", comment: "constant" },
        { title: "Extruder 1. Tick per minute", tag: "E1TickPerM", comment: "constant" },
        { title: "Extruder 1. Delay interval to speed", tag: "E1DelayIntervalToSpeed", comment: "constant" },
        { title: "Min speed", tag: "MinSpeed", comment: "constant" },
        { title: "Max pressure", tag: "PressureMax", comment: "constant" }
    ];

    var refresh = function () {
        self.loading = true;
        printerSettingsService.get().then(
        function success(data) {
            self.settings = data;
        },
        function error(error) {
            self.error = "Error while loading: " + error;
        })
        .finally(function () {
            self.isLoading = false;
        });
    };
    
    refresh();

    this.save = function () {
        return printerSettingsService.save(self.settings);
    }

    this.reset = function () {
        return dialogService
            .confirm("Are you sure to reset all printer constants to defaults?", 'Confirm reset to defaults')
            .then(function success() {
                return printerSettingsService.reset().then(function success() { 
                    refresh();
                });
            }, function error() {
                return "cancelled";
            });
    };

    $scope.$on('$destroy', function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', refreshChartByStatus);
    });
}]);

app.controller('settingsServerController', 
['websiteSettingsService', 'macrosService', 'websiteSettings',
function (websiteSettingsService, macrosService, websiteSettings) {
    var self = this;

    this.logLevels = [
        { title: 'All', value: 'ALL' },
        { title: 'Trace', value: 'TRACE' },
        { title: 'Debug', value: 'DEBUG' },
        { title: 'Info', value: 'INFO' },
        { title: 'Warn', value: 'WARN' },
        { title: 'Error', value: 'ERROR' },
        { title: 'Fatal', value: 'FATAL' },
        { title: 'Off', value: 'OFF' }
    ];

    this.selectedLogLevel = null;
    this.oldPassword = null;
    this.newPassword = null;

    this.dashboardMacroses = [];
    this.selectedMacroses = [];
    this.selectedDashboardMacroses = [];
    this.websiteSettings = null;
    var macrosResource = macrosService.getMacrosResource();

    macrosResource.query().$promise.then(function success(data) {
        self.macroses = data;
        
        return websiteSettingsService.get().then(function success(settings) {
            self.websiteSettings = settings;

            Rx.Observable.fromArray(self.logLevels)
            .first({
                predicate: function(level) { return level.value == settings.logLevel;},
                defaultValue: null
            })
            .subscribe(function (value) {
                self.selectedLogLevel = value;
            });

            self.websiteSettings.dashboardMacrosIds.forEach(function (macrosId) {
                var macrosToMoveIndex = null;
                for (var i = 0; i < self.macroses.length; i++) {
                    if (self.macroses[i].id == macrosId) {
                        macrosToMoveIndex = i;
                        break;
                    }
                }

                if (macrosToMoveIndex != null) {
                    self.dashboardMacroses.push(self.macroses.splice(macrosToMoveIndex, 1)[0]);
                }    
            });
        });
    },
    function error(error) {
        self.error = 'Error while page loading: ' + error;
    });

    this.moveToDashboard = function (macroses) {
        macroses.forEach(function (macros) {
            var index = self.macroses.indexOf(macros);
            self.dashboardMacroses.push(self.macroses.splice(index, 1)[0]);
        });
    };

    this.removeFromDashboard = function (macroses) {
        macroses.forEach(function (macros) {
            var index = self.dashboardMacroses.indexOf(macros);
            self.macroses.push(self.dashboardMacroses.splice(index, 1)[0]);
        });
    };

    this.moveDashboardMacrosUp = function (macros) {
        var index = self.dashboardMacroses.indexOf(macros);
        if (index - 1 >= 0) {
            var tmp = self.dashboardMacroses[index - 1];
            self.dashboardMacroses[index - 1] = self.dashboardMacroses[index];
            self.dashboardMacroses[index] = tmp;
        }
    };

    this.moveDashboardMacrosDown = function (macros) {
        var index = self.dashboardMacroses.indexOf(macros);
        if (index + 1 < self.dashboardMacroses.length) {
            var tmp = self.dashboardMacroses[index + 1];
            self.dashboardMacroses[index + 1] = self.dashboardMacroses[index];
            self.dashboardMacroses[index] = tmp;
        }
    };

    this.saveSettings = function () {
        var macrosIds = [];
        self.dashboardMacroses.forEach(function (macros) {
            macrosIds.push(macros.id);
        });

        self.websiteSettings.logLevel = self.selectedLogLevel.value;
        self.websiteSettings.dashboardMacrosIds = macrosIds;

        return websiteSettingsService.save(self.websiteSettings).then(function success() {
            websiteSettings.settings = self.websiteSettings;
            document.title = websiteSettings.settings.printerName + " Console";
        });
    };
}]);

app.controller('settingsChangePasswordController', ['websiteSettingsService', function (websiteSettingsService) {
    var self = this;

    this.changePassword = function () {
        return websiteSettingsService.changePassword(self.oldPassword, self.newPassword)
        .finally(function () {
            self.newPassword = null;
            self.oldPassword = null;
        });
    }
}]);

app.controller('settingsBrowserController', ['localStorageService', 'browserSettings', '$scope',
function (localStorageService, browserSettings, $scope) {
    var self = this;
    this.showVirtualKeyboard = browserSettings.showVirtualKeyboard;
    this.isDarkTheme = browserSettings.isDarkTheme;

    $scope.$watch(function () { return self.showVirtualKeyboard; },
    function (newValue, oldValue) {
        if (localStorageService.isSupported) {
            localStorageService.set('showVirtualKeyboard', newValue);
        }

        browserSettings.showVirtualKeyboard = newValue;
    });

    $scope.$watch(function () { return self.isDarkTheme; }, 
    function (newValue, oldValue) {
        if (localStorageService.isSupported) {
            localStorageService.set('isDarkTheme', newValue);
        }

        browserSettings.isDarkTheme = newValue;
    });
}]);

app.controller('consoleController', 
['macrosService', '$uibModal', 'websiteSettingsService', 'loader', 'commandService', 
function (macrosService, $uibModal, websiteSettingsService, loader, commandService) {
    var self = this;
    loader.show = true;  

    this.commands = [
        { title: 'Home', command: 'G28' },
        { title: 'Temperature to zero', command: 'M104 S0' }, 
        { title: 'Temperature to 205', command: 'M104 S205' },
        { title: 'Fan On', command: 'M106 S255' },
        { title: 'Fan Off', command: 'M106 S0' },
        { title: 'Reset values', command: 'M206 S0' }
    ];

    this.setCommand = function (command) {
        self.command = command;
    };

    this.sendCommand = function(command) {
        return commandService.sendCommand(command);
    }  

    var macrosResource = macrosService.getMacrosResource();

    this.macroses = [];
    
    macrosResource.query().$promise.then(
    function success(macroses) {
        websiteSettingsService.get().then(function success(settings) {
            settings.dashboardMacrosIds.forEach(function (macroId) {
                for (var i = 0; i < macroses.length; i++) {
                    if (macroses[i].id == macroId) {
                        self.macroses.push(macroses[i]);
                        break;
                    }
                }
            });
        });
    }).finally(function () {
        loader.show = false;
    });

    this.runMacros = function (macros) {
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

app.controller('movementsController', [function () {

}]);

app.controller('baseSliderController', 
['parent', '$scope', '$rootScope', 'dialogService', '$location',
function (parent, $scope, $rootScope, dialogService, $location) {
    var self = parent;

    var onRouteChange = function (event, newUrl) {
        if (self.value !== self.getValue()) {
            dialogService.confirm("Are you sure to discard changes?", 'Unsaved changes')
            .then(function success () {
                locationChangeUnregistrator();
                var path = newUrl.substring(newUrl.indexOf("#") + 2, newUrl.length);
                $location.path(path);
            });

            event.preventDefault();
        }
    };

    var locationChangeUnregistrator = $rootScope.$on('$locationChangeStart', onRouteChange);

    $scope.$on('$destroy', function () {
       locationChangeUnregistrator(); 
    });

    self.value = self.getValue();

    self.changeValue = function (delta) {
        if (self.value + delta > self.maxValue) {
            self.value = self.maxValue;
            return;
        }

        if (self.value + delta < self.minValue) {
            self.value = self.minValue;
            return;
        }

        self.value = self.value + delta;
    };
}]); 

app.controller('fanController', 
['commandService', '$controller', '$scope', 'printerStatus',
function (commandService, $controller, $scope, printerStatus) {
    var self = this;

    self.getValue = function () {
        return parseInt(printerStatus.status.cullerRate / 2550 * 100);
    };

    self.minValue = 0;
    self.maxValue = 100;

    self.apply = function () {
        return commandService.sendCommand('M106 S' + parseInt(255 * (self.value / 100)));
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);

app.controller('temperatureController', 
['commandService', '$controller', '$scope', 'printerStatus',
function (commandService, $controller, $scope, printerStatus) {
    var self = this;

    self.getValue = function () {
        return printerStatus.status.baseTemp / 10;
    };

    self.minValue = 0;
    self.maxValue = 300;

    self.apply = function () {
        return commandService.sendCommand('M104 S' + self.value);
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);

app.controller('speedController', 
['commandService', '$controller', '$scope', 'printerStatus',
function (commandService, $controller, $scope, printerStatus) {
    var self = this;

    self.getValue = function () {
        return printerStatus.status.speed;
    };

    self.minValue = 5;
    self.maxValue = 300;

    self.apply = function () {
        return commandService.sendCommand('M220 S' + self.value);
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);
