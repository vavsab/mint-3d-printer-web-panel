app.service('fileUpload', ['$http', '$q', function ($http, $q) {
    this.uploadFileToUrl = function(file, uploadUrl){
        var deferred = $q.defer();
        var fd = new FormData();
        fd.append('file', file);

        $http.post(uploadUrl, fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        })
        .success(function(){
            deferred.resolve();
        })
        .error(function(response){
            deferred.reject(response.error);
        });

        return deferred.promise;
    }
}]);

app.service('commandService', ['$http', '$q', function ($http, $q) {
    this.sendCommand = function(commandName, isDirectCommand = false) {
        return $q(function(resolve, reject) {
            $http.post("/api/command/" + commandName, { isDirectCommand: isDirectCommand })
            .success(function (response) {
                resolve();
            })
            .error(function (response) {
                reject(response.error);
            })
        });
    };
}]);

app.service('printerStatusService', ['$http', 'eventAggregatorFactory', function ($http, eventAggregatorFactory) {
    this.eventAggregator = new eventAggregatorFactory();
    var self = this;
    this.status = null;

    var socket = io.connect();
    socket.on('status', function (data) {
        console.log(data);
        self.status = data;
        self.eventAggregator.trigger('statusReceived', data);
    });

    socket.on('event', function (data) {
        if (data.type == 'endPrint') {
            self.eventAggregator.trigger('printingEnded', data);
        }
    });
}]);

app.factory('eventAggregatorFactory', [function () {
    return function () {
        var self = this;
        this.events = [];
        
        var findIndexByEventName = function (eventName, createIfMissing = false) {
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