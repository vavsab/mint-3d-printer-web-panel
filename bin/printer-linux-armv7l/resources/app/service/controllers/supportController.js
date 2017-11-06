const printerIdController = require('./printerIdController');
const config = require('config');
const logger = require('../logger');
const { spawn, exec } = require('child_process');
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
    return printerIdController.getIdHash()
    .then(printerIdHash => {
        return new Promise((resolve, reject) => {
            exec(`${pathToSupportScript} --status --printer-id ${printerIdHash}`, (err, stdout, stderr) => {
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
        })
    });
};

self.connect = (message) => {
    return printerIdController.getIdHash()
    .then(printerIdHash => {
        return new Promise((resolve, reject) => {
            let parameters = ['--connect', '--printer-id', printerIdHash];
            if (message) {
                parameters.push('--msg');
                parameters.push(message);
            }

            let errorText = '';
            let outputText = '';
            connectProcess = spawn(pathToSupportScript, parameters);

            connectProcess.stdout.on('data', (data) => {
                outputText += data.toString();
            });

            connectProcess.stderr.on('data', (data) => {
                errorText += data.toString();
            });

            connectProcess.on('exit', (code) => {
                if (code != 0) {
                    let match = /\s*"error"\s*:\s*"(.*)"/.exec(`${errorText} ${outputText}`);
                    if (match == null || match.length < 2) {
                        reject(`${errorText} ${outputText}`);
                    } else {
                        reject(match[1]);
                    }
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