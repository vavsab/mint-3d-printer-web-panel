app.service('tokenService', ['httpq', function (httpq) {
    var self = this;

    this.get = function(password) {
        return httpq.post('/api/token', {password: password});
    };

    this.logout = function() {
        return httpq.delete('/api/token');
    };

    this.checkToken = function() {
        return httpq.get('/api/checkToken');
    };
}]);

app.service('dialogService', ['$uibModal', '$q', function ($uibModal, $q) {
    var self = this;
    
    this.play2048 = function (message, title) {
        var modalInstance = $uibModal.open({
            templateUrl: '/partials/dialogs/2048Dialog.html',
            controller: '2048DialogController',
            controllerAs: '$ctrl',
            resolve: {
                message: function () {
                    return message;
                },
                title: function () {
                    return title;
                }
            }
        });

        return modalInstance.result;
    };

    this.prompt = function (message, title) {
        var modalInstance = $uibModal.open({
            templateUrl: '/partials/dialogs/promptDialog.html',
            controller: 'promptDialogController',
            controllerAs: '$ctrl',
            resolve: {
                message: function () {
                    return message;
                },
                title: function () {
                    return title;
                }
            }
        });

        return modalInstance.result;
    };

    this.confirm = function (message, title) {
        var modalInstance = $uibModal.open({
            templateUrl: '/partials/dialogs/confirmDialog.html',
            controller: 'confirmDialogController',
            controllerAs: '$ctrl',
            resolve: {
                message: function () {
                    return message;
                },
                title: function () {
                    return title;
                }
            }
        });

        return modalInstance.result;
    };

    this.powerOff = function (shutdownTime) {
        var modalInstance = $uibModal.open({
            templateUrl: '/partials/dialogs/powerOffDialog.html',
            controller: 'powerOffDialogController',
            controllerAs: '$ctrl',
            resolve: {
                shutdownTime: function () {
                    return shutdownTime;
                }
            }
        });

        return modalInstance;
    };
}]);

app.service('alertService', ['eventAggregatorFactory', function (eventAggregatorFactory) {
    var self = this;
    this.alerts = [];
    this.eventAggregator = new eventAggregatorFactory();

    this.add = function(type, message, code) {
        if (code != null) {
            for (var i = 0; i < self.alerts.length; i++) {
                if (self.alerts[i].code === code) {
                    self.alerts.splice(i, 1);
                    i--;
                }
            }
        }

        self.alerts.push({type: type, message: message, code: code, time: new Date()});
        self.eventAggregator.trigger('alertsChanged');
    };
}]);

app.service('commandService', ['httpq', function (httpq) {
    this.sendCommand = function(command) {
        return httpq.post("/api/command/", {command: command});
    };
}]);

app.service('printerStatusService', 
['$http', 'httpq', 'eventAggregatorFactory', '$q', 'printerStatus', 'socket', 
function ($http, httpq, eventAggregatorFactory, $q, printerStatus, socket) {
    this.eventAggregator = new eventAggregatorFactory();
    var self = this;

    var refreshStatus = function (status) {
        console.log(status);
        printerStatus.status = status;
        self.eventAggregator.trigger('statusReceived', status);
    };

    socket.on('status', function (data) {
        refreshStatus(data);
    });

    socket.on('event', function (data) {
        if (data.type == 'endPrint') {
            self.eventAggregator.trigger('printingEnded', data);
        }
    });

    this.getStatus = function () {
        return $q(function(resolve, reject) {
            if (self.status == null) {
                $http.get('/api/status')
                .success(function (status) {
                    self.status = status;
                    refreshStatus(status);
                    resolve(status);
                })
                .error(function (response) {
                    reject(response.error);
                });
            } else {
                resolve(self.status);
            }
        });
    };

    this.getHotendTemperatureChartData = function () {
        return httpq.get('/api/status/temperature/hotend');
    };

    this.getBedTemperatureChartData = function () {
        return httpq.get('/api/status/temperature/bed');
    };

    this.checkResume = function () {
        return httpq.get('/api/status/resume');
    };

    this.cancelResume = function () {
        return httpq.delete('/api/status/resume');
    };

    this.getStatus();
}]);

app.factory('eventAggregatorFactory', [function () {
    return function () {
        var self = this;
        this.events = [];
        
        var findIndexByEventName = function (eventName, createIfMissing) {
            createIfMissing = createIfMissing === undefined ? false : createIfMissing;
            var index = -1;
            for (var i = 0; i < self.events.length; i++) {
                if (self.events[i].eventName == eventName) {
                    index = i;
                    break;
                }
            }

            if (createIfMissing && index == -1) {
                self.events.push({ eventName: eventName, callbacks: [] });
                index = self.events.length - 1;
            }

            return index;
        };

        this.on = function(eventName, callback) {
            var index = findIndexByEventName(eventName, true);
            self.events[index].callbacks.push(callback);
        }

        this.unsubscribe = function(eventName, callback) {
            var index = findIndexByEventName(eventName, false);
            if (index == -1) {
                return;
            }

            var oldCallbacks = self.events[index].callbacks;
            self.events[index].callbacks = [];
            oldCallbacks.forEach(function (oldCallback) {
                if (oldCallback != callback) {
                    self.events[index].callbacks.push(oldCallback);
                }
            }) 
        }

        this.trigger = function(eventName, data) {
            var index = findIndexByEventName(eventName);
            if (index == -1) {
                return;
            }

            self.events[index].callbacks.forEach(function (callback) {
                callback(data);
            }) 
        }
    };
}]);

app.service('logService', ['$http', '$q', 'httpq', function ($http, $q, httpq) {
    this.getFile = function(fileName) {
        return $q(function(resolve, reject) {
            var anchor = angular.element('<a/>');
            anchor.css({display: 'none'}); 
            angular.element(document.body).append(anchor);

            anchor.attr({
                href: '/api/log/?fileName=' + encodeURI(fileName),
                target: '_blank',
                download: fileName
            })[0].click();

            anchor.remove(); // Clean it up afterwards
            resolve();
        });
    }

    this.getFilesInfo = function() {
        return $q(function(resolve, reject) {
            $http.get("/api/log/")
            .success(function (response) {
                resolve(response.files);
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    };

    this.getPrinterErrors = function() {
        return httpq.get("/api/log/printer");
    };

    this.remove = function(fileName) { 
        return $q(function(resolve, reject) {
            $http.delete("/api/log/", { params: {fileName: fileName} })
            .success(function (response) {
                resolve();
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    };
}]);


app.service('fileService', ['$http', '$q', 'Upload', 'httpq', 'eventAggregatorFactory', 
function ($http, $q, Upload, httpq, eventAggregatorFactory) {
    var self = this;
    this.eventAggregator = new eventAggregatorFactory();

    this.getDiskspace = function () {
        return httpq.get('api/fileManager/diskspace').then(function (diskspace) {
            self.eventAggregator.trigger('diskspace', diskspace);
        });
    }

    this.getDiskspace();

    // Refresh every 10 minutes
    setInterval(self.getDiskspace, 1000 * 60 * 10);

    this.getFolderContents = function (folderPath) {
        return $q(function(resolve, reject) {
            $http.get("/api/fileManager", { params: {path: folderPath} })
            .success(function (response) {
                resolve(response);
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    }

    this.remove = function(path) {
        return $q(function(resolve, reject) {
            $http.delete("/api/fileManager", { params: {path: path} })
            .success(function (response) {
                self.getDiskspace().then(function() {
                    resolve();
                });
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    };

    this.createDirectory = function(directoryName, path) {
        return $q(function(resolve, reject) {
            $http.post("/api/fileManager/directory", { directoryName: directoryName, path: path })
            .success(function (response) {
                resolve();
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    };

    this.uploadFileToDirectory = function(file, directory) {
        return Upload.upload({
            url: '/api/fileManager?directory=' + directory,
            data: {file: file}
        }).then(function () {
            return self.getDiskspace();
        });
    }

    this.analyseGcode = function(path) {
        var deferred = $q.defer();

        $http.get('/api/fileManager/gcode', { params: { path: path }})
        .success(function (response) {
            deferred.resolve(response);
        })
        .error(function (response) {
            deferred.reject(response.error);
        })

        return deferred.promise;
    };
}]);

app.service('macrosService', ['$http', '$q', '$resource', 'commandService', 
function ($http, $q, $resource, commandService) {

    this.getMacrosResource = function () {
        return $resource('/api/macros/:id', {id : '@id'});    
    };

    this.run = function (macros, parameterValues) {
        var deferred = $q.defer();
        var promise = deferred.promise;
        var script = macros.content;

        for (var i = 0; i < macros.parameters.length; i++) {
            var parameter = macros.parameters[i];
            var regex = new RegExp("\%" + parameter.name + "\%", "g");
            var value = parameterValues[parameter.name];
            if (value === undefined) {
                deferred.reject("Parameter '"+ parameter.title +"' is not set");
                return promise;
            }

            script = script.replace(regex, value);
        };

        console.log("Macros script to run: '" + script + "'");
        
        script.split(/\n/).forEach(function (line) {
            // Skip empty lines
            if (line.match(/^\s*$/))
                return;

            promise = promise.then(function success() {
                return commandService.sendCommand(line);
            });
        });
        
        deferred.resolve();
        return promise;
    };
}]);

app.service('websiteSettingsService', ['httpq', 'gettextCatalog', '$q',
function (httpq, gettextCatalog, $q) {
    this.get = function () {
        return httpq.get('/api/settings/website');
    };

    this.changePassword = function (oldPassword, newPassword) {
        return httpq.post('/api/settings/website/password', {
            oldPassword: oldPassword, 
            newPassword: newPassword
        });
    };

    this.save = function (settings) {
        return httpq.post('/api/settings/website', settings);
    };

    this.changeLanguage = function (language) {
        var code = null;
        switch (language) {
            case 'English':
                break;
            case 'Russian':
                code = 'ru_RU';
                break;
            case 'Ukrainian':
                code = 'uk_UA';
                break;
            default:
                throw 'Language "' + language + '" is not supported';
        }
        
        gettextCatalog.setCurrentLanguage(code);

        if (code != null)
            return gettextCatalog.loadRemote('/i18n/' + code + '.json');
        else
            return $q.resolve();
    };
}]);

app.service('updateService', ['httpq', function (httpq) {
    this.getStatus = function () {
        return httpq.get('/api/settings/update/status');
    };

    this.fetch = function () {
        return httpq.get('/api/settings/update/fetch');
    };

    this.pullAsync = function () {
        return httpq.post('/api/settings/update/pull');
    }

    this.installAsync = function () {
        return httpq.post('/api/settings/update/install');
    }
}]);

app.service('networkService', ['httpq', function (httpq) {
    this.getState = function () {
        return httpq.get('/api/settings/network/state');
    };

    this.getWifiAPs = function () {
        return httpq.get('/api/settings/network/wifi');
    };

    this.connectToAP = function (apName, password) {
        return httpq.post('/api/settings/network/wifi', {apName: apName, password: password});
    };
}]);

app.service('printerSettingsService', ['httpq', function (httpq) {

    this.reset = function () {
        return httpq.post('/api/settings/printer/reset');
    };

    this.get = function () {
        return httpq.get('/api/settings/printer');
    };

    this.save = function (settings) {
        return httpq.post('/api/settings/printer', settings);
    };
}]);

app.service('supportSettingsService', ['httpq', function (httpq) {

    this.getStatus = function () {
        return httpq.get('/api/settings/support');
    }

    this.connect = function (message) {
        return httpq.post('/api/settings/support/connect', {message: message});
    }

    this.disconnect = function () {
        return httpq.post('/api/settings/support/disconnect');
    }
}]);

app.service('botSettingsService', ['httpq', function (httpq) {

    this.get = function () {
        return httpq.get('/api/settings/bot');
    }

    this.set = function (botSettings) {
        return httpq.post('/api/settings/bot', {botSettings: botSettings});
    }
}]);