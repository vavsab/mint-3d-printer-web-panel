app.controller('settingsPrinterExtruderController', 
['printerSettingsService', 'commandService', 'loader', '$q', 'printerStatus',
function (printerSettingsService, commandService, loader, $q, printerStatus) {
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
        return commandService.sendCommand("G1 E" + self.extruderPosition + " F1000");
    };

    this.resetOverExtrusion = function () {
        return commandService.sendCommand("M221 S100");
    };

    this.recalculateOverExtrusion = function () {
        return commandService.sendCommand("M221 S" + parseInt(self.extruderPosition * 100 / self.actualExtruderPosition));
    };

    this.applyOverExtrusion = function () {
        if (printerStatus.status == null || printerStatus.status.extrOver == null) {
            return $q(function (resolve, reject) {
                reject("Has no extruder status received from printer. Cannot apply settings.");
            });
        }

        var delayKey = "E1DelayIntervalToSpeed";
        var tickKey = "E1TickPerM";

        var overExtrusion = printerStatus.status.extrOver;
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

    this.settings = null;
    this.offset = { z: 0 };
    this.isLoading = true;

    self.getStartChartData = printerStatusService.getHotendTemperatureChartData;

    self.getChartDataFromStatus = function (status) {
        return [status.temp / 10, status.baseTemp / 10];
    }

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
        { title: "Extruder 1. Tick per meter", tag: "E1TickPerM", comment: "constant" },
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

    this.languages = [
        { title: 'English', value: 'English' },
        { title: 'Русский (частично)', value: 'Russian' },
        { title: 'Українська (частково)', value: 'Ukrainian' }
    ];

    this.selectedLogLevel = null;
    this.selectedLanguage = null;

    this.dashboardMacroses = [];
    this.selectedMacroses = [];
    this.selectedDashboardMacroses = [];
    this.websiteSettings = null;
    var macrosResource = macrosService.getMacrosResource();

    macrosResource.query().$promise.then(function success(data) {
        self.macroses = data;
        
        return websiteSettingsService.get().then(function success(settings) {
            self.websiteSettings = settings;

            for (var i = 0; i < self.logLevels.length; i++) {
                var level = self.logLevels[i];
                if (level.value == settings.logLevel) {
                    self.selectedLogLevel = level;
                    break;
                }
            }

            for (var i = 0; i < self.languages.length; i++) {
                var level = self.languages[i];
                if (level.value == settings.language) {
                    self.selectedLanguage = level;
                    break;
                }
            }

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
        self.websiteSettings.language = self.selectedLanguage.value;
        self.websiteSettings.dashboardMacrosIds = macrosIds;

        return websiteSettingsService.save(self.websiteSettings).then(function success() {
            websiteSettings.settings = self.websiteSettings;
            document.title = websiteSettings.settings.printerName + " Console";
        }).then(function success() {
            return websiteSettingsService.changeLanguage(self.websiteSettings.language);
        })
        .then(function success() {
            return 'ok';
        });
    };
}]);

app.controller('settingsChangePasswordController', 
['websiteSettingsService', '$q', function (websiteSettingsService, $q) {
    var self = this;

    this.changePassword = function () {
        return $q(function (resolve, reject) {
            if (self.newPassword != self.confirmPassword) {
                reject('New passwords do not match');
            } else {
                resolve();
            }
        })
        .then(function () {
            return websiteSettingsService.changePassword(self.oldPassword, self.newPassword)
        })
        .then(function () {
            self.newPassword = null;
            self.oldPassword = null;
            self.confirmPassword = null;
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

app.controller('settingsUpdateController', ['updateService', 'socket', 
function (updateService, socket) {
    var self = this;

    self.newVersion = null;
    self.status = null;

    updateService.getStatus().then(function success(status) {
        self.status = status;
    });

    socket.on('event', function (data) {
        if (data.type == 'update.statusChanged') {
            self.status = data.newStatus;
        }
    });

    self.fetch = function () {
        return updateService.fetch()
            .then(function success(version) {
                if (self.status.version.version != version.version)  {
                    self.newVersion = version;
                    self.isUpToDate = false;
                } else {
                    self.newVersion = null;
                    self.isUpToDate = true;
                }
            });
    };

    self.pull = function () { return updateService.pullAsync(); };

    self.install = function () { return updateService.installAsync(); };
}]);

app.controller('settingsNetworkController', ['networkService', 'dialogService',
function (networkService, dialogService) {
    var self = this;

    self.wifiAPs = [];
    self.message = null;
    self.state = null;

    var refreshIP = function () {
        return networkService.getState().then(function success(state) {
            self.state = state;
        }, function error() {
            self.state = null;
        });
    };

    refreshIP();

    self.getWifiAPs = function () {
        self.message = null;

        return networkService.getWifiAPs().then(function success(wifiAPs) {
            self.wifiAPs = wifiAPs;
        });
    }

    self.connectToAP = function (apName) {
        self.message = null;

        return dialogService.prompt('Specify network password', '')
        .then(function success(password) {
            return networkService.connectToAP(apName, password).then(function success() {
                refreshIP();
            });
        })
        .then(function success() {
            self.wifiAPs = [];
            self.message = "Connected to " + apName;
        })
        .then(function () {
            return refreshIP();
        });
    }
}]);

app.controller('settingsPrinterConfigurationController', 
['powerService', 'websiteSettingsService', 'websiteSettings',
function (powerService, websiteSettingsService, websiteSettings) {
    var self = this;

    self.powerStatus = null;
    self.websiteSettings = null;
    
    powerService.getStatus().then(function success(status) {
        self.powerStatus = status;
    });

    websiteSettingsService.get().then(function success(settings) {
        self.websiteSettings = settings;
    });

    self.save = function () {
        if (self.websiteSettings.printerSize.type === 'cylinder') {
            self.websiteSettings.printerSize.y = self.websiteSettings.printerSize.x;
        }

        return websiteSettingsService.save(self.websiteSettings)
        .then(function success() {
            angular.copy(self.websiteSettings, websiteSettings.settings);
        });
    }
}]);

app.controller('settingsSupportController', 
['supportSettingsService', 'dialogService', 
function (supportSettingsService, dialogService) {
    var self = this;

    self.isConnected = null;
    self.error = null;

    supportSettingsService.getStatus()
    .then(function success(isConnected) {
        self.isConnected = isConnected;
        self.error = null;
    }, function error(error) {
        self.error = error;
    });

    self.connect = function () {
        return dialogService.prompt('Specify support reason (optional)')
        .then(function success(message) {
            return supportSettingsService.connect(message);
        })
        .then(function success() {
            self.isConnected = true;
            self.error = null;
        });
    }

    self.disconnect = function () {
        return dialogService.confirm('Are you sure to disconnect support session?', 'Support session disconnect')
        .then(function success()  {
            return supportSettingsService.disconnect();
        })
        .then(function success() {
            self.isConnected = false;
            self.error = null;
        });
    }
}]);