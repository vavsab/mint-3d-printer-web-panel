module.exports = (socketController, printerProxy, printerStatusController) => {
    const logger = require('../logger');
    const powerOff = require('power-off');
    const utils = require('../utils');
    const { exec } = require('child_process');
    const configurationController = require('./configurationController');
    const secondsToPause = 2;
    const secondsBetweenPinsQuery = 1;
    const STATE_POWER_ON = 'PowerOn';
    const STATE_POWER_OFF = 'PowerOff';

    let self = this;

    let status = {
        isUPSEnabled: false,
        state: null,
        shutdownTime: null
    };

    let getPinValue = pin => {
        return new Promise((resolve, reject) => {
            exec(`"${utils.getPathFromBase('service/scripts/getPinValue')}" ${pin}`,
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(parseInt(stdout));
                    }
            });
        });
    };

    // Determine whether UPS is enabled
    status.isUPSEnabled = false;

    const isUPSEnabledPin = 24;
    const isPowerPresentPin = 10;

    let queryPins = () => {
        getPinValue(isUPSEnabledPin)
        .then(isEnabled => {
            status.isUPSEnabled = isEnabled;
            if (isEnabled) {
                return getPinValue(isPowerPresentPin)
                .then(value => {
                    status.state = value == 1 ? STATE_POWER_ON : STATE_POWER_OFF;
                });
            }
        }).then(() => statusUpdated(), reason => logger.error(`powerController > queryPins > ${reason}`));
    }

    //setInterval(queryPins, secondsBetweenPinsQuery * 1000);

    let shutdownTimer;

    let statusUpdated = () => {
        if (!status.isUPSEnabled)
            return;
        
        if (status.state == STATE_POWER_OFF && !status.shutdownTime) {
            configurationController.get(configurationController.KEY_WEBSITE_SETTINGS)
            .then(websiteSettings => {
                let secondsToShutdown = websiteSettings.secondsToShutdownOnPowerOff;
                status.shutdownTime = new Date(new Date().getTime() + secondsToShutdown * 1000); 
                logger.warn(`UPS > Schedule to power off at ${status.shutdownTime}`);
                socketController.sendToAll('UPS.powerOff', { shutdownTime: status.shutdownTime });
                shutdownTimer = setTimeout(self.safeShutdown, status.shutdownTime - new Date());
            });
        }

        if (status.state == STATE_POWER_ON && status.shutdownTime) {
            status.shutdownTime = null; 
            logger.warn(`UPS > Power on`);
            socketController.sendToAll('UPS.powerOn');
            clearTimeout(shutdownTimer);
        }
    }

    this.getStatus = () => status;

    this.shutdown = () => new Promise((resolve, reject) => {
        powerOff((err, stderr, stdout) => {
            if(!err && !stderr) {
                reject(stderr);
            } else {
                resolve();
            }
        });
    });

    this.safeShutdown = () => {
        return new Promise((resolve, reject) => {
            const statesThatDoNotRequirePause = ['Idle', 'Pause', 'PauseBuffering', 'PausePrintBuffering'];
            if (statesThatDoNotRequirePause.indexOf(printerStatusController.currentStatus.state)) {
                printerProxy.send('pause');
                printerProxy.send('M109 S50'); // Wait temperature to 50
                printerProxy.send('M104 S0'); // Temperature to 0
                printerProxy.send('M106 S0'); // Turn off fans
                printerProxy.send('M18'); // Turn off motors
                setTimeout(() => resolve(), secondsToPause * 1000);
            } else {
                resolve();
            }
        }).then(() => self.shutdown());
    }

    return this;
}