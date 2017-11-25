app.controller("themeController", ['browserSettings', function (browserSettings) {
    this.browserSettings = browserSettings;
}]);

app.controller('mainController', 
['$scope', 'alertService', 'siteAvailabilityInterceptor', 'printerStatusService', 
    'commandService', '$q', 'dialogService', 'loader', 'localStorageService', 'browserSettings',
    'websiteSettings', 'websiteSettingsService', 'fileService', '$window', 'powerService', 
    'printerStatus', '$location', 'tokenErrorInterceptor', '$cookies', 'tokenService',
function ($scope, alertService, siteAvailabilityInterceptor, printerStatusService, 
    commandService, $q, dialogService, loader, localStorageService, browserSettings,
    websiteSettings, websiteSettingsService, fileService, $window, powerService,
    printerStatus, $location, tokenErrorInterceptor, $cookies, tokenService) {
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
        tokenService.logout().then(function success() {
            $location.path('/lockScreen');
        }, function error(error) {
            alertService.add('danger', 'Could not logout: ' + error, 'logout_error');
        });
    }

    $scope.alerts = alertService.alerts;

    siteAvailabilityInterceptor.onError = function () {
        alertService.add('danger', 'Site is not available', 'site_not_available');
    };

    tokenErrorInterceptor.onError = function () {
        if ($location.path().indexOf('lockScreen') == -1) {
            self.lock();
            alertService.add('warning', 'Session has expired', 'session_expired');
        }
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
        $scope.$applyAsync();
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
        
        alertService.add('success', 'Printing was finished', 'printing_finished');
    };
    
    printerStatusService.eventAggregator.on('printingEnded', onPrintingEnded);
    
    self.stop = function () {
        return dialogService.confirm("Are you sure to stop printing?", 'Emergency stop').then(
            function success () {
                return commandService.sendCommand("stop");
        });
    };

    self.pause = function () { 
        return dialogService.confirm("Are you sure to pause?", 'Pause').then(
            function success() {
                return commandService.sendCommand("pause");
            }
        );
    };

    self.resume = function () { 
        return commandService.sendCommand("resume");
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

        websiteSettingsService.changeLanguage(settings.language).then(function success() {
            // Refresh all bindings
            $scope.$applyAsync();
        });
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
            powerService.shutdown().catch(function (error) {
                alertService.add('danger', 'Shutdown failed: ' + error, 'shutdown_failed');
            });
        });
    };


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

    // Start token checking
    tokenService.checkToken().then(function () {
        if ($location.path().indexOf('lockScreen') != -1) {
            $location.path('/');
        }
    });
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

        tokenService.get(password).then(function success() {
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

app.controller('dashboardController', ['printerStatusService', 'dialogService', 'commandService', 'gettextCatalog', 
function (printerStatusService, dialogService, commandService, gettextCatalog) {
    var self = this;

    self.isPauseMode = false;

    self.resume = function () { 
        return commandService.sendCommand("resume")
            .then(function success() {
                self.isPauseMode = false;
            });
    };

    self.cancelResume = function () {
        return dialogService.confirm(
            gettextCatalog.getString("Are you sure that you don't need to resume? It will be impossible to resume after that."), 
            gettextCatalog.getString('Clear pause'))
            .then(function success() {
                return printerStatusService.cancelResume();
            })
            .then(function success() {
                self.isPauseMode = false;
            });
    };

    printerStatusService.checkResume().then(function (result) {
        self.isPauseMode = result;
    });
}]);

app.controller('fileManagerController', 
['$scope', 'fileService', '$q', 'commandService', '$uibModal', 'dialogService', 'Upload', 'websiteSettings', 'gettextCatalog',
function ($scope, fileService, $q, commandService, $uibModal, dialogService, Upload, websiteSettings, gettextCatalog) {

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
            dialogService.confirm("Are you sure to remove '" + file.fileName + "'?", gettextCatalog.getString('Confirm removal')).then(
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
                resolve(gettextCatalog.getString('cancelled'));
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

app.controller('movementsController', 
['printerStatus', 'printerStatusService', '$scope', 
'commandService', 'websiteSettings', 'sizeCoeff', '$q', 'gettextCatalog',
function (printerStatus, printerStatusService, $scope, 
    commandService, websiteSettings, sizeCoeff, $q, gettextCatalog) {
    var self = this;
    var shouldGetCoordsAfterMoveHome = false;
    self.isApplyMode = false;

    var getPrinterSize = function () {
        if (websiteSettings.settings) {
            if (websiteSettings.settings.printerSize.type != 'cylinder')
                throw 'Only cylinder table type is supported';

            return websiteSettings.settings.printerSize;
        }

        return null;
    };

    self.motorsOn = printerStatus.status.motorsOn == 1;

    self.motorsChange = function () {
        commandService.sendCommand(self.motorsOn ? 'M17' : 'M18');
    }

    self.sliderValue = 0; 
    self.moveSpeed = 4000; 
    self.redCircleXCoord = 40;
    self.redCircleYCoord = 40;

    self.moveHome = function (axis) {
        var command;
        switch (axis) {
            case 'x':
                command = 'G1 X0 F' + self.moveSpeed;
                self.currentPos.X = 0;
                break;
            case 'y':
                command = 'G1 Y0 F' + self.moveSpeed;
                self.currentPos.Y = 0;
                break;
            case 'z':
                command = 'G1 Z0 F' + self.moveSpeed;
                self.currentPos.Z = 0;
                break;
            default:
                command = 'G28';
                self.currentPos = null;
                return commandService.sendCommand(command)
                .then(function success() {
                    shouldGetCoordsAfterMoveHome = true;
                });
        }

        return commandService.sendCommand(command);
    };

    self.move = function (diffs) {
        var printerSize = getPrinterSize();
        if (printerSize == null)
            return $q.reject(gettextCatalog.getString('No data about printer size'));

        if (!self.currentPos)
            return $q.reject(gettextCatalog.getString('No data about hotend position'));
            
        var startX = self.currentPos.X;
        var startY = self.currentPos.Y;
        var startZ = self.currentPos.Z;
        return $q(function (resolve, reject) {
            var parts = [];
            var outOfTableMessage = gettextCatalog.getString('Move outside of table');

            if (diffs.x) {
                self.currentPos.X += diffs.x * sizeCoeff;
            }

            if (diffs.y) {
                self.currentPos.Y += diffs.y * sizeCoeff;
            }
            
            if ((self.currentPos.X * self.currentPos.X 
                + self.currentPos.Y * self.currentPos.Y)
                > (printerSize.x * printerSize.x * sizeCoeff * sizeCoeff / 4)) {
                return reject(outOfTableMessage);
            }
                            
            parts.push('X' + self.currentPos.X / sizeCoeff);
            parts.push('Y' + self.currentPos.Y / sizeCoeff);

            var maxZ = printerSize.z * sizeCoeff;
            var moveZToAllowedZoneFirst = false;

            if (self.currentPos.Z > maxZ) {
                // Need to get out of zone, where hotend cannot move free.
                parts.push('Z' + printerSize.z);
                moveZToAllowedZoneFirst = true;
            } else {
                if (diffs.z) {
                    self.currentPos.Z += diffs.z * sizeCoeff;

                    if (self.currentPos.Z < 0 || self.currentPos.Z > maxZ)
                        return reject(outOfTableMessage);

                    parts.push('Z' + self.currentPos.Z / sizeCoeff);
                }
            }

            if (parts.length > 0) {
                var sendG1Promise = function () {
                    var command = 'G1 ' + parts.join(' ') + ' F' + self.moveSpeed;
                    commandService.sendCommand(command)
                    .then(function success() {
                        return commandService.sendCommand('G300');
                    })
                    .then(function success() {
                        resolve();
                    });
                };

                if (moveZToAllowedZoneFirst) {
                    var command = 'G1 Z' + printerSize.z + ' F' + self.moveSpeed;
                    return commandService.sendCommand(command)
                        .then(function success() {
                            self.currentPos.Z = maxZ;
                            return sendG1Promise();
                        });
                } else {
                    return sendG1Promise();
                }
            }
        }).catch(function error(msg) {
            self.currentPos.X = startX;
            self.currentPos.Y = startY;
            self.currentPos.Z = startZ;
            return $q.reject(msg);
        });
    };
    
    var refreshStatus = function (status) {
      var printerSize = getPrinterSize();
      if (printerSize == null)
        return;
      
      var bedOrigin = {
        x: printerSize.x / 2,
        y: printerSize.y / 2,
        z: 0
      };

      if (self.currentPos == null || shouldGetCoordsAfterMoveHome) {
          self.currentPos = {
              X: status.currentPos.X,
              Y: status.currentPos.Y,
              Z: status.currentPos.Z
          };
          
          shouldGetCoordsAfterMoveHome = false;
      }

      var sliderValue = ((self.currentPos.Z / sizeCoeff) + bedOrigin.z) / printerSize.z * 100;
      if (sliderValue > 100) {
          sliderValue = 100;
      }

      self.sliderValue = sliderValue;

      self.redCircleXCoord = ((self.currentPos.X / sizeCoeff) + bedOrigin.x) / printerSize.x * 80;
      self.redCircleYCoord = ((self.currentPos.Y / sizeCoeff) + bedOrigin.y) / printerSize.y * 80;
    };

    refreshStatus(printerStatus.status);
    printerStatusService.eventAggregator.on('statusReceived', refreshStatus);

    $scope.$on('$destroy', function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', refreshStatus);
    });
}]);

app.controller('baseSliderController', 
['parent', '$scope', '$rootScope', 'dialogService', '$location',
function (parent, $scope, $rootScope, dialogService, $location) {
    var self = parent;

    var onRouteChange = function (event, newUrl) {
        if (self.initialValue !== self.value) {
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
    self.initialValue = self.value;

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

    self.apply = function () {
        return self.sendCommand().then(function success() { self.initialValue = self.value; });
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

    self.sendCommand = function () {
        return commandService.sendCommand('M106 S' + parseInt(255 * (self.value / 100)));
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);

app.controller('speedController', 
['commandService', '$controller', '$scope', 'printerStatus',
function (commandService, $controller, $scope, printerStatus) {
    var self = this;

    self.getValue = function () {
        return printerStatus.status.feedRate / 10;
    };

    self.minValue = 5;
    self.maxValue = 300;

    self.sendCommand = function () {
        return commandService.sendCommand('M220 S' + parseInt(self.value));
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);
