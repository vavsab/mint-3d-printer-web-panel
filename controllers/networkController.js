module.exports = () => {
    const wifiControl = require('wifi-control');
    const logger = require('../logger');
    const os = require('os');

    wifiControl.configure({
        iface: 'wlan0'
    });

    this.getIP = () => {
        try {
            return os.networkInterfaces().wlan0[0].address
        } catch (e) {
            logger.warn(`Error while getting IP address ${e}`);
            return null;
        }
    }

    this.getWifiAPs = () =>
        new Promise((resolve, reject) => {
            wifiControl.scanForWiFi((err, response) => {
                if (err) {
                    logger.error(`NetworkController > Error while scanning networks > ${err}`);
                    reject(err);
                } else {
                    resolve(response.networks);
                }
            });
        });

    this.connectToAP = (apName, password) => 
        new Promise((resolve, reject) => {

            let apInfo = {
                ssid: apName,
                password: password
            };

            wifiControl.connectToAP(apInfo, (err, response) => {
                if (err) {
                    logger.error(`NetworkController > Error while connecting to network '${apName}' > ${err}`);
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });

    return this;
};