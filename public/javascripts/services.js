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
    var observerCallbacks = [];
    var self = this;
    this.status = null;

    this.onStatusChanged = function(callback) {
        observerCallbacks.push(callback);
    };

    var notifyObservers = function(data) {
        angular.forEach(observerCallbacks, function(callback){
            callback(data);
        });
    };

    var socket = io.connect();
    socket.on('status', function (data) {
        console.log(data);
        self.status = data;
        notifyObservers(data);
    });
}]);