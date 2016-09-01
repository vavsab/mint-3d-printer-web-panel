app.controller('mainController', ['$scope', function ($scope) {
    $scope.Header = "Keep Calm Printer Console";
}]);

app.controller('dashboardController', ['$scope', '$http', 'printerStatusService', 'commandService', function ($scope, $http, printerStatusService, commandService) {
    var msToTime = function (s) {
        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;

        return hrs + ':' + mins + ':' + secs;
    };

    var onStatusReceived = function(status) {
        $scope.status = status;
        $scope.status.timeRemained = msToTime($scope.status.remainedMilliseconds)
        $scope.$apply();
    };

    printerStatusService.eventAggregator.on('statusReceived', onStatusReceived);

    var onPrintingEnded = function() {
        alert("Printing is finished");
    };
    
    printerStatusService.eventAggregator.on('printingEnded', onPrintingEnded);
    
    $scope.$on("$destroy", function () {
        printerStatusService.eventAggregator.unsubscribe('statusReceived', onStatusReceived);
        printerStatusService.eventAggregator.unsubscribe('printingEnded', onPrintingEnded);
    });
    
    $scope.isCommandRunning = false;

    $scope.sendCommand = function() {
        $scope.commandError = null;
        $scope.isCommandRunning = true;

        commandService.sendCommand($scope.commandName, true)
        .then(
            function success() {
                $scope.commandSucceded = true;
            },
            function error(error) {
                $scope.commandSucceded = false;
                $scope.commandError = error;
            }
        )
        .finally(function () {
            $scope.isCommandRunning = false;    
        });
    }
}]);

app.controller('fileManagerController', ['$scope', 'fileUpload', function ($scope, fileUpload) {
    $scope.isRunning = false;

    $scope.sendFile = function () {
        $scope.isRunning = true;
        $scope.error = null;

        fileUpload.uploadFileToUrl($scope.file, '/api/fileUpload')
            .then(function success() {
                $scope.succeded = true;
            },
            function error(error) {
                $scope.error = error;
            })
            .finally(function () {
                $scope.isRunning = false;
            });
    }
}]);
