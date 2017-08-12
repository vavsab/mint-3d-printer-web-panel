const self = module.exports;
const config = require('config');
const exec = require('child_process').exec;
const pathToPrinterId = config.get('pathToPrinterId');

self.id = null;

self.getIdHash = () => {
    return new Promise((resolve, reject) => {
        if (self.id == null) {
            reject("Cannot get serial data");
        }

        exec(`${pathToPrinterId} ${self.id}`, (err, stdout, stderr) => {
            if (err) {
                let errorText = err + stderr + stdout;
                logger.error(`printerIdController > Could not get id hash. Error: ${errorText}`);
                reject({error: errorText});
            } else {
                let outJson = JSON.parse(stdout);
                resolve(outJson.printer_id);
            }});
    });
};