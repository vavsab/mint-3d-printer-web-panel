const { exec, execSync, spawn } = require('child_process');
const fs = require('fs-extra');

var out = fs.openSync('./updateLog.log', 'a');
var err = fs.openSync('./updateLog.log', 'a');

let child = spawn("/bin/bash -c '" + './script.py' + " --install --printer-id " + '3242343242343242342344234234dsdfsdf324' + "'", [], 
{
    detached: true,
    stdio: [ 'ignore', out, err ]
});

child.unref();