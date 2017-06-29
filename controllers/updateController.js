module.exports = (socketController) => {
    const { exec, execSync, spawn } = require('child_process');
    const logger = require('../logger');
    const config = require('config');
    const fs = require('fs-extra');

    let self = this;
    let pathToUpdateScript = config.get('pathToUpdateScript');
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
    
    var checkPrinterID = (callback) =>{
       exec(`${pathToPrinterId} `+socketController.ID,(err,stdout,stderr)=>{
              if (err) {
                    reject({error: err});
                } else {
                  let printer_id = JSON.parse(stdout);
                  callback(printer_id.printer_id);
                }});
    };
    
    self.fetch = () => {
        return new Promise((resolve, reject) => {
            if (status.state == 'Downloading' || status.state == 'Installing'){
                reject(`Operation is not allowed for status '${status}'`);
                return;
            }  
            if(socketController.ID === undefined)
            {
              reject("Can't get serial data");
                return;
            }
            checkPrinterID((printer_id) =>{
              exec(`${pathToUpdateScript} --fetch --printer-id ${printer_id}`, (err, stdout, stderr) => {
                      if (err) {
                          reject({error: err});
                      } else {
                          let version = JSON.parse(stdout);
                          resolve(version);
                      }
                    });
            }); 
        });
    };

    self.startPull = () => {
        if (status.state == 'Downloading' || status.state == 'Installing')
            return { error: `Operation is not allowed for status '${status.state}'` };

        status.state = 'Downloading';
        raiseStatusRefresh();

        status.error = null;
        checkPrinterID((printer_id) =>{   
            exec(`${pathToUpdateScript} --pull --printer-id ${printer_id}`, (err, stdout, stderr) => {
              if (err) {
                status.error = err + stderr;
                status.state = 'DownloadingError';
                raiseStatusRefresh();
              } else {
                status.state = 'Downloaded';
                refreshDownloadedVersion();
                raiseStatusRefresh();
              }
            });
        });
    }

    self.startInstall = () => {
        if (status.state != 'Downloaded' && status.state != 'InstallingError')
            return { error: `Operation is not allowed for status '${status.state}'` };
        
        status.state = 'Installing';
        raiseStatusRefresh();
        checkPrinterID((printer_id) =>{
              let install = spawn(pathToUpdateScript, ['--install', `--printer-id ${printer_id}`], { detached: true });
  
              install.on('error', (err) => {
                  status.error = err + stderr;
                  status.state = 'InstallingError';
                  raiseStatusRefresh();    
              }); 
          }              
        );
        
    };

    return self;
}