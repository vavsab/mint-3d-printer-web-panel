module.exports = () => {
    const wifiControl = require('wifi-control');
    const logger = require('../logger');

    this.getWifiAPs = () =>
        new Promise((resolve, reject) => {
            wifiControl.scanForWiFi((err, response) => {
                if (err) {
                    logger.error(`NetworkController > Error while scanning networks > ${err}`);
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });

    this.connectToAP = (apName, password) => 
        new Promise((resolve, reject) => {

            let apInfo = {
                ssid: apName,
                password: password
            };

            wiFiControl.connectToAP(apInfo, (err, response) => {
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