app.controller('confirmDialogController', ['$uibModalInstance', 'message', 'title', 
function ($uibModalInstance, message, title) { 
    var self = this;
    self.title = title;
    self.message = message;
    
    self.ok = function () {
        $uibModalInstance.close();
    };

    self.cancel = function () {
        $uibModalInstance.dismiss('cancelled');
    };
}]);

app.controller('promptDialogController', ['$uibModalInstance', 'message', 'title', 
function ($uibModalInstance, message, title) { 
    var self = this;
    self.title = title;
    self.message = message;
    
    self.ok = function () {
        $uibModalInstance.close(self.response);
    };

    self.cancel = function () {
        $uibModalInstance.dismiss('cancelled');
  };
}]);

app.controller('analyseDialogController', ['$uibModalInstance', 'path', 'fileService', 
function ($uibModalInstance, path, fileService) { 
    var self = this;
    self.isLoading = true;
    self.error = null;
    
    fileService.analyseGcode(path).then(
    function success (result) {
        self.result = result;
    },
    function error (error) {
        self.error = error;
    }).finally(function () {
        self.isLoading = false;
    })

    self.ok = function () {
        $uibModalInstance.close();
    };
}]);

app.controller('2048DialogController', ['$uibModalInstance', 
function ($uibModalInstance) {
    var self = this; 
    self.close = function () {
        $uibModalInstance.close();
    };
}]);

app.controller('runMacrosDialogController', 
['$uibModalInstance', 'macros', 'macrosService', 'localStorageService', 'printerStatus',
function ($uibModalInstance, macros, macrosService, localStorageService, printerStatus) {
    var self = this;
    self.macros = macros;

    self.printerStatus = printerStatus;

    self.values = null;
    if (localStorageService.isSupported) {
        self.values = localStorageService.get("macroParams" + macros.id);
    } 
    
    if (!self.values) {
        self.values = {};
    }

    self.run = function () {
        return macrosService.run(self.macros, self.values).then(function success() {
            localStorageService.set("macroParams" + macros.id, self.values);
        });
    };

    self.close = $uibModalInstance.close;
}]);

app.controller('powerOffDialogController', 
['$uibModalInstance', 'powerService', '$scope', 'printerStatus', 'shutdownTime',
function ($uibModalInstance, powerService, $scope, printerStatus, shutdownTime) { 
    var self = this;

    self.printerStatus = printerStatus;

    var updateSeconds = function () {
        self.secondsToShutdown = parseInt((shutdownTime - new Date()) / 1000);
        if (self.secondsToShutdown < 0) {
            self.secondsToShutdown = 0;
        }

        $scope.$applyAsync();
    }
    
    updateSeconds();
    var intervalHandler = setInterval(updateSeconds, 1000);
    
    self.shutdown = function () {
        return powerService.safeShutdown();
    };

    $scope.$on('$destroy', function () {
        clearInterval(intervalHandler);
    });
}]);