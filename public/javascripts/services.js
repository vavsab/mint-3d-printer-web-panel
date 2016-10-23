app.service('dialogService', ['$uibModal', '$q', function ($uibModal, $q) {
    var self = this;
    
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
}]);

app.service('alertService', ['eventAggregatorFactory', function (eventAggregatorFactory) {
    var self = this;
    this.alerts = [];
    this.eventAggregator = new eventAggregatorFactory();

    this.add = function(type, message) {
        self.alerts.push({type: type, message: message});
        self.eventAggregator.trigger('alertsChanged');
    };
}]);

app.service('commandService', ['$http', '$q', function ($http, $q) {
    this.sendCommand = function(command) {
        return $q(function(resolve, reject) {
            $http.post("/api/command/", {command: command})
            .success(function (response) {
                resolve();
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    };
}]);

app.service('printerStatusService', ['$http', 'eventAggregatorFactory', '$q', function ($http, eventAggregatorFactory, $q) {
    this.eventAggregator = new eventAggregatorFactory();
    var self = this;
    this.status = null;

    var refreshStatus = function (status) {
        console.log(status);
        self.status = status;
        self.eventAggregator.trigger('statusReceived', status);
    };

    var socket = io.connect();
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
                    resolve(status);
                })
                .error(function (response) {
                    reject(response.error);
                });
            } else {
                resoleve(self.status);
            }
        });
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
            this.events[index].callbacks.push(callback);
        }

        this.unsubscribe = function(eventName, callback) {
            var index = findIndexByEventName(eventName, false);
            if (index == -1) {
                return;
            }

            var oldCallbacks = this.events[index].callbacks;
            this.events[index].callbacks = [];
            oldCallbacks.forEach(function (oldCallback) {
                if (oldCallback != callback) {
                    this.events[index].callbacks.push(oldCallback);
                }
            }) 
        }

        this.trigger = function(eventName, data) {
            var index = findIndexByEventName(eventName);
            if (index == -1) {
                return;
            }

            this.events[index].callbacks.forEach(function (callback) {
                callback(data);
            }) 
        }
    };
}]);

app.service('logService', ['$http', '$q', function ($http, $q) {
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


app.service('fileService', ['$http', '$q', 'Upload', function ($http, $q, Upload) {
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
                resolve();
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
            url: '/api/fileManager',
            data: {file: file, 'directory': directory}
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

app.service('websiteSettingsService', ['httpq', function (httpq) {
    this.get = function () {
        return httpq.get('/api/settings/website');
    };

    this.save = function (settings) {
        return httpq.post('/api/settings/website', settings);
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