app.controller('confirmDialogController', ['$uibModalInstance', 'message', 'title', 
function ($uibModalInstance, message, title) { 
    var self = this;
    self.title = title;
    self.message = message;
    
    self.ok = function () {
        $uibModalInstance.close();
    };

    self.cancel = function () {
        $uibModalInstance.dismiss();
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
        $uibModalInstance.dismiss();
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