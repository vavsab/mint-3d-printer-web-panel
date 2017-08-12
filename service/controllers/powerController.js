module.exports = (socketController, printerProxy, printerStatusController) => {
    const logger = require('../logger');
    const powerOff = require('power-off');
    const configurationController = require('./configurationController');
    const secondsToPause = 2;
    const secondsBetweenPinsQuery = 10;
    const STATE_POWER_ON = 'PowerOn';
    const STATE_POWER_OFF = 'PowerOff';

    let gpio = null;
    try {
        gpio = require('rpi-gpio');
    } catch (e) {
        logger.warn(`Error while resolving rpi-gpio: ${e}`);
    }

    let self = this;

    let status = {
        isUPSEnabled: false,
        state: null,
        shutdownTime: null
    };

    // Determine whether UPS is enabled
    status.isUPSEnabled = true;

    let queryPins = () => {
        if (gpio != null) {
            // Change state and update
            //status.state = STATE_POWER_OFF or STATE_POWER_ON;
            //statusUpdated();
        }
    }

    setInterval(queryPins, secondsBetweenPinsQuery * 1000);

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
                let result = printerProxy.send('pause');    
                if (!result) {
                    const errorMessage = 'PowerController > SafeShutdown > Printer is unavailable'; 
                    logger.warn(errorMessage);
                    reject(errorMessage);
                } else {
                    setTimeout(() => resolve(), secondsToPause * 1000);
                }
            } else {
                resolve();
            }
        }).then(() => self.shutdown());
    }

    return this;
}