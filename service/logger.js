const log4js = require('log4js');
const config = require('config');
const path = require('path');
const utils = require('./utils');
const fs = require('fs-extra');

const logsFolderPath = utils.getPathFromBase(config.get('pathToLogsFolder'));
  if (!fs.existsSync(logsFolderPath)) {
    fs.mkdirSync(logsFolderPath);
    console.log(`Files folder was created on '${logsFolderPath}'`);
  }

log4js.configure({
  appenders: [
    { type: 'console' },
    { 
        type: 'dateFile', 
        filename: path.join(logsFolderPath, 'webServer'), 
        category: 'webServer',
        pattern: "-yyyy-MM-dd.log",
        alwaysIncludePattern: true }
  ]
});

module.exports = log4js.getLogger('webServer');