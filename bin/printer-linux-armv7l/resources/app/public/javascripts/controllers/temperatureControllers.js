app.controller('temperatureController', 
['websiteSettings', function (websiteSettings) {
    var self = this;

    self.websiteSettings = websiteSettings;
}]);

app.controller('temperatureHotendController', 
['commandService', '$controller', '$scope', 'printerStatus', 'printerStatusService',
function (commandService, $controller, $scope, printerStatus, printerStatusService) {
    var self = this;

    self.getValue = function () {
        return printerStatus.status.baseTemp / 10;
    };

    self.minValue = 0;
    self.maxValue = 300;

    self.sendCommand = function () {
        return commandService.sendCommand('M104 S' + self.value);
    }

    self.getStartChartData = printerStatusService.getHotendTemperatureChartData;

    self.getChartDataFromStatus = function (status) {
        return [status.temp / 10, status.baseTemp / 10];
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);


app.controller('temperatureBedController', 
['commandService', '$controller', '$scope', 'printerStatus', 
'printerStatusService', 'websiteSettings', '$location',
function (commandService, $controller, $scope, printerStatus, 
    printerStatusService, websiteSettings, $location) {
    var self = this;

    if (!websiteSettings.settings.isHeatbedAvailable) {
        $location.path('/');
    }

    self.getValue = function () {
        return printerStatus.status.bedBaseTemp / 10;
    };

    self.minValue = 0;
    self.maxValue = 120;

    self.sendCommand = function () {
        return commandService.sendCommand('M140 S' + self.value);
    }

    self.getStartChartData = printerStatusService.getBedTemperatureChartData;

    self.getChartDataFromStatus = function (status) {
        return [status.bedTemp / 10, status.bedBaseTemp / 10];
    }

    $controller('baseSliderController', { parent: self, $scope: $scope });
}]);