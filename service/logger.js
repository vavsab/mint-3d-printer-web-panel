var log4js = require('log4js');

log4js.configure({
  appenders: [
    { type: 'console' },
    { 
        type: 'dateFile', 
        filename: 'logs/webServer', 
        category: 'webServer',
        pattern: "-yyyy-MM-dd.log",
        alwaysIncludePattern: true }
  ]
});

module.exports = log4js.getLogger('webServer');