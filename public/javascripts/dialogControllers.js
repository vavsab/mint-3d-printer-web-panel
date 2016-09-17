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

app.controller('analyseDialogController', ['$uibModalInstance', 'fileName', 
function ($uibModalInstance, fileName) { 
    var self = this;

    self.ok = function () {
        $uibModalInstance.close();
    };
}]);