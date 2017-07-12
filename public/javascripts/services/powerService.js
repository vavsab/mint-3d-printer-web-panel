app.service('powerService', ['httpq', 'socket', 'dialogService',
function (httpq, socket, dialogService) {
    var self = this;

    this.shutdown = function() {
        return httpq.post('/api/power/shutdown');
    };

    this.safeShutdown = function() {
        return httpq.post('/api/power/safeShutdown');
    };

    this.getStatus = function() {
        return httpq.get('/api/power/status');
    };

    var modalInstance;

    var showPowerOffDialog = function (shutdownTime) {
        modalInstance = dialogService.powerOff(Date.parse(shutdownTime));
    };

    self.getStatus().then(function success(data) {
        if (data.shutdownTime) {
            showPowerOffDialog(data.shutdownTime);
        }
    });

    socket.on('UPS.powerOff', function (data) {
        showPowerOffDialog(data.shutdownTime);
    });

    socket.on('UPS.powerOn', function () {
        if (modalInstance) {
            modalInstance.close();
            modalInstance = null;
        }
    });
}]);