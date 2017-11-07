const path = require('path');
const config = require('config');
const globalConstants = require('./globalConstants');

module.exports.newGuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

module.exports.getPathFromBase = (pathString) => {
    if (path.isAbsolute(pathString)) {
        return pathString;
    } 

    return path.join(path.normalize(path.join(__dirname, '..')), pathString)
}

module.exports.getPathForConfig = (pathString) => {
    if (path.isAbsolute(pathString)) {
        return pathString;
    } 

    return path.join(module.exports.getPathFromBase(config.get('pathToConfigFiles')), pathString)
}
