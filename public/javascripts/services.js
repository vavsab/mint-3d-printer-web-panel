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

app.service('printerStatusService', ['$http', function ($http) {
    var statusCallbacks = [];
    var eventCallbacks = [];
    var self = this;
    this.status = null;

    this.onStatusChanged = function(callback) {
        statusCallbacks.push(callback);
    };

    this.onEvent = function(callback) {
        eventCallbacks.push(callback);
    };

    var notifyStatusObservers = function(data) {
        angular.forEach(statusCallbacks, function(callback){
            callback(data);
        });
    };

    var notifyEventObservers = function(data) {
        angular.forEach(eventCallbacks, function(callback){
            callback(data);
        });
    };

    var socket = io.connect();
    socket.on('status', function (data) {
        console.log(data);
        self.status = data;
        notifyStatusObservers(data);
    });

    socket.on('event', function (data) {
        if (data.type == 'endPrint') {
            notifyEventObservers();
        }
    });
}]);