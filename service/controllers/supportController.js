const printerIdController = require('./printerIdController');
const config = require('config');
const logger = require('../logger');
const exec = require('child_process').exec;
self = module.exports;

const pathToSupportScript = config.get('pathToSupportScript');

const tryGetErrorText = (stdout) => {
    try {
        let outJSON = JSON.parse(stdout);
        if (outJSON.success === false && outJSON.error) {
            return outJSON.error;
        } else {
            return null;
        }
    } catch (e) {
        return null;
    }
    
}

self.isConnected = () => {
    return new Promise((resolve, reject) => {
        exec(`${pathToSupportScript} --status`, (err, stdout, stderr) => {
            if (err) {
                let errorText = tryGetErrorText(stdout);
                if (errorText == null) {
                    errorText = err + stderr + stdout;
                }
                
                logger.error(`supportController > getStatus > ${errorText}`);
                reject(errorText);
            } else {
                let outJSON = JSON.parse(stdout);
                resolve(outJSON.connected);
            }
        });
    });
};

self.connect = (message) => {
    return printerIdController.getIdHash()
    .then(printerIdHash => {
        return new Promise((resolve, reject) => {
            let messageCommand = "";
            if (message) {
                messageCommand = ` --msg ${message}`;
            }

            exec(`${pathToSupportScript} --connect --printer-id ${printerIdHash}${messageCommand}`, 
            (err, stdout, stderr) => {
                if (err) {
                    let errorText = tryGetErrorText(stdout);
                    if (errorText == null) {
                        errorText = err + stderr + stdout;
                    }

                    reject(errorText);
                } else {
                    resolve();
                }
            });
        });
    });
};

self.disconnect = () => {
    return printerIdController.getIdHash()
    .then(printerIdHash => {
        return new Promise((resolve, reject) => {
            exec(`${pathToSupportScript} --disconnect --printer-id ${printerIdHash}`, (err, stdout, stderr) => {
                if (err) {
                    let errorText = tryGetErrorText(stdout);
                    if (errorText == null) {
                        errorText = err + stderr + stdout;
                    }

                    reject(errorText);
                } else {
                    resolve();
                }
            });
        });
    });
};