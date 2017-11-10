module.exports = (socketController) => {
    const { exec, execSync, spawn } = require('child_process');
    const logger = require('../logger');
    const config = require('config');
    const fs = require('fs-extra');
    const printerIdController = require('./printerIdController');

    let self = this;
    let pathToUpdateScript = config.get('pathToUpdateScript');
    let pathToInstallScript = config.get('pathToInstallScript');
    let pathToPrinterId = config.get('pathToPrinterId');
    let pathToVersion = config.get('pathToVersion');

    // Statuses:
    // - Idle
    // - Downloading
    // - DownloadingError
    // - Downloaded
    // - Installing
    // - InstallingError

    let status = {state: 'Idle', error: null};
    
    try {
        let versionString = fs.readFileSync(pathToVersion).toString();
        status.version = JSON.parse(versionString);
    } catch (e) {
        logger.error(`Could not read version file ${e}`);
    }

    let refreshDownloadedVersion = () => {
        let stateString = execSync(`${pathToUpdateScript} --status`).toString();
        status.downloaded_version = JSON.parse(stateString).downloaded_version;
    }
    
    try {
        refreshDownloadedVersion();
    } catch (e) {
        logger.error(`Could not check update status ${e}`);
    }
    
    if (status.downloaded_version) {
        status.state = 'Downloaded';
    }

    let raiseStatusRefresh = () => {
        logger.info(`Update status changed to ${JSON.stringify(status)}`);

        if (status.error) {
            logger.error(`Error on status: ${JSON.stringify(status)}`);
        }
        
        socketController.sendToAll('event', { type: 'update.statusChanged', newStatus: status});
    };

    self.getStatus = () => status;
    
    self.fetch = () => {
        return new Promise((resolve, reject) => {
            if (status.state == 'Downloading' || status.state == 'Installing'){
                reject(`Operation is not allowed for status '${status}'`);
                return;
            } 

            printerIdController.getIdHash()
            .then(printerIdHash => {
                exec(`${pathToUpdateScript} --fetch --printer-id ${printerIdHash}`, (err, stdout, stderr) => {
                    if (err) {
                        reject({error: err + stderr + stdout});
                    } else {
                        let version = JSON.parse(stdout);
                        resolve(version);
                    }
                });
            })
            .catch(error => reject(error));
        });
    };

    self.startPull = () => {
        if (status.state == 'Downloading' || status.state == 'Installing')
            return { error: `Operation is not allowed for status '${status.state}'` };

        status.state = 'Downloading';
        raiseStatusRefresh();

        status.error = null;

        printerIdController.getIdHash()
        .then(printerIdHash => {
            return new Promise((resolve, reject) => {
                let pullProcess = spawn(pathToUpdateScript, ['--pull', '--printer-id', printerIdHash]);
                let error = '';
                let out = '';

                pullProcess.stdout.on('data', (chunk) => {
                    out += chunk;
                });

                pullProcess.stderr.on('data', (chunk) => {
                    error += chunk;
                });

                pullProcess.on('close', code => {
                    if (code != 0 || error !== '') {
                        reject(`Code: ${code}, Error: ${error}, Output: ${out}`);
                    } else {
                        resolve();
                    }
                });
            })
        })
        .then(() => {
            status.state = 'Downloaded';
            refreshDownloadedVersion();
            raiseStatusRefresh();
        }, (error) => {
            status.error = error;
            status.state = 'DownloadingError';
            raiseStatusRefresh();
        });
    }

    self.startInstall = () => {
        if (status.state != 'Downloaded' && status.state != 'InstallingError')
            return { error: `Operation is not allowed for status '${status.state}'` };
        
        status.state = 'Installing';
        raiseStatusRefresh();
        
        exec(pathToInstallScript,  (err, stdout, stderr) => {
            if (err) {
                logger.error(`Error during installation of updates ${err + stderr}`);
            }
        });
    };

    return self;
}