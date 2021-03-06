﻿module.exports = (tokenPassword, printerProxy, printerStatusController) => {
    const express = require('express');
    const fs = require('fs-extra');
    const path = require('path');
    const multer = require('multer');
    const diskspace = require('diskspace');
    const config = require('config');
    const logger = require('../logger');
    const globalConstants = require('../globalConstants');
    const jsonWebToken = require('jsonwebtoken');
    const crypto = require('crypto');
    const utils = require('../utils');
    const fork = require('child_process').fork;
    
    const logsRootPath = fs.realpathSync(utils.getPathFromBase(config.get('pathToLogsFolder')));
    const fileManagerRootPath = fs.realpathSync(utils.getPathFromBase(config.get('pathToFilesFolder')));
    
    const router = express.Router();
    const isDemo = config.get('isDemo');

    /* Open services */

    let passwordHash;
    try {
        passwordHash = JSON.parse(fs.readFileSync(utils.getPathForConfig(globalConstants.printerPasswordsPath)).toString())[0].password;
    } catch (e) {
        passwordHash = null;
    }

    router.post('/token', function (req, res) {
        let enteredPassword = req.body.password;

        if (passwordHash && (!enteredPassword || passwordHash != crypto.createHash('md5').update(enteredPassword).digest('hex'))) {
            res.status(400).json({error: 'Invalid password'});
            return;
        }

        let expireTimeOut = 60*60*24*360; // 1 year
        let token = jsonWebToken.sign({user: 'mint'}, tokenPassword, {
            expiresIn: expireTimeOut
        });

        res.cookie('token', token, { maxAge: expireTimeOut, httpOnly: true }).send();
    });

    router.delete('/token', function (req, res) {
        res.clearCookie("token").send();
    });

    // For getting the last printer status
    router.get('/status', function (req, res) {
        res.status(200).json(printerStatusController.currentStatus);
    });

    router.get('/fileManager/diskspace', function (req, res) {
        diskspace.check(path.parse(fileManagerRootPath).root, function (err, total, free, status) {
            if (err) {
                let error = 'diskspace: ' + err;
                logger.warn(error)
                res.status(500).json({error: error});
            } else {
                res.status(200).json({ total: total, free: free });
            }
        })
    });

    // Provide token security
    router.use(function (req, res, next) {
        if (!passwordHash)
        {
            next();
            return;    
        }

        // check header or url parameters or post parameters for token
        var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];

        // decode token
        if (token) {
            // verifies secret and checks exp
            jsonWebToken.verify(token, tokenPassword, function(err, decoded) {      
                if (err) {
                    return res.status(403).json({ error: 'Failed to authenticate token' });    
                } else {
                    // if everything is good, save to request for use in other routes
                    req.user = decoded.user;    
                    next();
                }
            });
        } else {
            // if there is no token
            // return an error
            return res.status(403).json({ 
                error: 'No token provided' 
            });
        }
    });

    /* Secure services */

    router.get('/checkToken', function(req, res, next) {
        // If reached here then it passed token verification
        res.send();
    });

    router.post('/command', function (req, res) {
        var command = req.body.command;

        // process start command path
        var startCommand = null;
        if (command.startsWith('start ')) {
            startCommand = 'start ';
        }

        if (command.startsWith('startb ')) {
            startCommand = 'startb ';
        }
 
        if (startCommand != null) {

            // get file path
            var startFilePath = command.replace(startCommand, '');

            // remove start slash
            startFilePath = startFilePath.replace(/^[\\\/]/g, '');

            logger.trace('startFilePath: ' + startFilePath);
            startFilePath = fs.realpathSync(path.join(fileManagerRootPath, startFilePath));
            logger.trace('startFilePath: ' + startFilePath);
            if (!startFilePath.startsWith(fileManagerRootPath)) {
                res.status(400).json({ error: "Path violation" });
                return;
            } else {
                command = startCommand + startFilePath;
            }
        }

        logger.trace("command: " + command);

        if (command != null) {
            var result = printerProxy.send(command);
            
            if (!result) {
                var errorMessage = 'Printer is unavailable'; 
                logger.warn(errorMessage);
                res.status(500).json({ error: errorMessage });
            } else {
                res.status(200).send();
            }
        } else {
            res.status(404).json({ error: "command not found" });
        }
    });

    router.get('/log/printer', function (req, res) { 
        res.status(200).json(printerStatusController.lastPrinterErrors);
    });

    router.get('/log', function (req, res) { 
        var fileName = req.query.fileName;

        var fileNames = fs.readdirSync(logsRootPath);
        var totalSize = 0;
        var fileData = [];
        fileNames.forEach(function (fileName) {
            fileData.push({fileName: fileName, size: fs.statSync(path.join(logsRootPath, fileName)).size});
        });

        if (!fileName) {
            res.status(200).json({
                files: fileData, 
            });
        } else {
            res.download(path.join(logsRootPath, fileName));
        }
    });

    router.delete('/log', function(req, res) {
        var pathToFile = path.join(logsRootPath, req.query.fileName)
        if (!pathToFile.startsWith(logsRootPath)) {
            res.status(400).json({error: 'Path violation'});
        }

        fs.unlinkSync(pathToFile);
        res.status(200).send();
    });

    // For getting the latest temperature measurements
    router.get('/status/temperature/hotend', function (req, res) {
        res.status(200).json(printerStatusController.hotendTemperatureChartData);
    });

    router.get('/status/temperature/bed', function (req, res) {
        res.status(200).json(printerStatusController.bedTemperatureChartData);
    });

    router.get('/status/resume', function(req, res, next) {
        let pauseFileExists = fs.existsSync(utils.getPathForConfig(globalConstants.printerPauseInfoPath));
        res.send(pauseFileExists);
    });

    router.delete('/status/resume', function(req, res, next) {
        fs.removeSync(utils.getPathForConfig(globalConstants.printerPauseInfoPath));
        res.send();
    });

    router.get('/fileManager', function (req, res) {
        var currentFolderAbsolutePath = fs.realpathSync(path.join(fileManagerRootPath, req.query.path));
        if (!currentFolderAbsolutePath.startsWith(fileManagerRootPath)) {
            res.status(400).json({error: 'Path violation'});
        }

        var files = [];
        fs.readdirSync(currentFolderAbsolutePath).forEach(function (fileName) {
            var stats = fs.statSync(path.join(currentFolderAbsolutePath, fileName));
            files.push({
                fileName: fileName,
                isDirectory: stats.isDirectory(),
                size: stats.size
            })
        });

        res.status(200).json(files);
    });

    router.delete('/fileManager', function(req, res) {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        var fileAbsolutePath = fs.realpathSync(path.join(fileManagerRootPath, req.query.path));
        if (!fileAbsolutePath.startsWith(fileManagerRootPath)) {
            res.status(400).json({error: 'Path violation'});
        } else {
            if (fs.statSync(fileAbsolutePath).isDirectory()) {
                fs.rmdirSync(fileAbsolutePath);
            } else {
                fs.unlinkSync(fileAbsolutePath);
            }

            res.status(200).send();
        }
    });

    var uploadFile = multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {

                var folderAbsolutePath = fs.realpathSync(path.join(fileManagerRootPath, req.query.directory));
                if (!folderAbsolutePath.startsWith(fileManagerRootPath)) {
                    cb(new Error("Path violation"));   
                    return; 
                }

                logger.trace("folderAbsolutePath : " + folderAbsolutePath);
                cb(null, folderAbsolutePath);
            },
            filename: function (req, file, cb) {
                logger.trace("file.originalname : " + file.originalname);
                cb(null, file.originalname);
            }
        }
    )}).single("file");

    router.post('/fileManager', function(req, res) {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        uploadFile(req, res, function (err) {
            if (err) {
                res.status(400).json({error: 'Path violation'}); 
                return;
            }

            res.status(200).send();
        });
    });

    router.post('/fileManager/directory', function(req, res) {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        logger.trace("create directory:" + req.body.directoryName + " path: " + req.body.path);
        var absolutePath = fs.realpathSync(path.join(fileManagerRootPath, req.body.path));

        if (!absolutePath.startsWith(fileManagerRootPath)) {
            res.status(400).json({error: 'Path violation'});
        } else {
            fs.mkdirSync(path.join(absolutePath, req.body.directoryName));
            res.status(200).send();
        }
    });

    router.get('/fileManager/gcode', function(req, res) {
        var gcodeFilePath = req.query.path;
        logger.trace("analyse gcode:" + gcodeFilePath);
        var absolutePath = fs.realpathSync(path.join(fileManagerRootPath, gcodeFilePath));

        if (!absolutePath.startsWith(fileManagerRootPath)) {
            res.status(400).json({error: 'Path violation'});
        } else { 
            var analyseGcode = (absolutePath, callback) => {
                const gcodeAnalyser = fork('service/gcodeAnalyser');
                gcodeAnalyser.on('message', (message) => {
                    if (message.cmd == 'returnModel') {
                        logger.trace('analyseGcode: model analyzed');
                        gcodeAnalyser.send( { cmd: 'analyzeModel' });
                    }

                    if (message.cmd == 'analyzeDone') {
                        logger.trace('analyseGcode: analyzeDone');
                        callback(message.msg);
                    }
                });

                gcodeAnalyser.send({
                    cmd: 'parseGCode',
                    data: {
                        gcode: fs.readFileSync(absolutePath).toString().split(/\n/),
                        options: {
                            firstReport: 5
                        }
                    }
                });
            };
            
            var result = analyseGcode(absolutePath, function (result) {
                logger.trace('analyseGcode: done');

                var plaDensity = 1.24;
                result.totalWeight = plaDensity * 3.141 * 1.75 * 1.75 / 10 / 10 / 4 * result.totalFilament / 10;

                res.status(200).json(result);
            });
        }
    });

    try {
        fs.statSync(utils.getPathForConfig(globalConstants.macrosSettingsPath));
    }
    catch (e) {
        fs.copySync(utils.getPathForConfig(globalConstants.defaultMacrosSettingsPath), 
            utils.getPathForConfig(globalConstants.macrosSettingsPath));
    }

    router.get('/macros', function (req, res) {
        if (req.id == null) {
            res.json(JSON.parse(fs.readFileSync(utils.getPathForConfig(globalConstants.macrosSettingsPath)).toString()));
        }
    });

    router.post('/macros/:id', function (req, res) {
        macrosList = JSON.parse(fs.readFileSync(utils.getPathForConfig(globalConstants.macrosSettingsPath)).toString());
        var id = req.params.id;
        var indexToReplace = null;
        for (var i = 0; i < macrosList.length; i++) {
            if (macrosList[i].id == id) {
                indexToReplace = i;
                break;
            }
        };

        if (indexToReplace != null) {
            var macros = macrosList[indexToReplace];
            if (macros.isReadOnly) {
                res.status(400).json({error: "Cannot edit readonly macros"});
                return;
            }

            macrosList[indexToReplace] = req.body; 
        } else {
            macrosList.push(req.body);
        }

        fs.writeFileSync(utils.getPathForConfig(globalConstants.macrosSettingsPath), JSON.stringify(macrosList));
        res.send();
    });

    router.delete('/macros/:id', function (req, res) {
        macrosList = JSON.parse(fs.readFileSync(utils.getPathForConfig(globalConstants.macrosSettingsPath)).toString());

        var id = req.params.id;
        var indexToReplace = null;
        for (var i = 0; i < macrosList.length; i++) {
            logger.warn(macrosList[i].id);
            if (macrosList[i].id == id) {
                indexToReplace = i;
                break;
            }
        };

        if (indexToReplace != null) {
            if (macrosList[indexToReplace].isReadOnly) {
                res.status(400).json("Cannot delete readonly macros");
                return;
            }

            macrosList.splice(indexToReplace, 1);
            fs.writeFileSync(utils.getPathForConfig(globalConstants.macrosSettingsPath), JSON.stringify(macrosList));
        } else {
            res.status(404);
        }

        res.send();
    });

    router.post('/settings/website/password', function (req, res) {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        let passwords;
        try {
            passwords = JSON.parse(fs.readFileSync(utils.getPathForConfig(globalConstants.printerPasswordsPath)).toString());
        } catch (e) {
            passwords = [{ user: 'mint', password: null }];
        }
        
        let currentPassword = passwords[0].password;
        let oldPassword = req.body.oldPassword;
        let newPassword = req.body.newPassword;

        if (currentPassword != null && 
            (oldPassword == null || currentPassword != crypto.createHash('md5').update(oldPassword).digest('hex'))) {
            res.status(400).json({error: 'Old password is wrong'})
            return;
        }

        if (newPassword) {
            passwords[0].password =crypto.createHash('md5').update(newPassword).digest('hex');
        } else {
            passwords[0].password = null;
        }

        passwordHash = passwords[0].password;
        fs.writeFileSync(utils.getPathForConfig(globalConstants.printerPasswordsPath), JSON.stringify(passwords));
        res.send();
    });

    try {
        fs.statSync(utils.getPathForConfig(globalConstants.printerSettingsPath));
    }
    catch (e) {
        fs.copySync(utils.getPathForConfig(globalConstants.defaultPrinterSettingsPath), 
            utils.getPathForConfig(globalConstants.printerSettingsPath));
    }

    let getPrinterSettingsJson = () => {
        var result = {};
        fs.readFileSync(utils.getPathForConfig(globalConstants.printerSettingsPath)).toString().split(/\n/)
        .forEach((line) => {
            let keyValue = line.split(' ');
            if (keyValue.length < 2)
                return;

            let value = parseInt(keyValue[1]);
            if (!isFinite(value)) 
                value = 0;

            result[keyValue[0]] = value;
        });

        return result;
    };

    router.get('/settings/printer', function (req, res) {
        res.json(getPrinterSettingsJson());
    });

    router.post('/settings/printer', function (req, res) {
        var currentSettings = getPrinterSettingsJson();
        var settings = req.body;
        
        for (let property in settings) {
            currentSettings[property] = settings[property];
        }

        let result = '';
        for (let property in currentSettings) {
            let value = parseInt(currentSettings[property])
            if (!isFinite(value)) 
                value = 0

            result += `${property} ${value}\n`;
        }

        fs.writeFileSync(utils.getPathForConfig(globalConstants.printerSettingsPath), result);
        printerProxy.send('UpdateSettings');
        res.send();
    });

    router.post('/settings/printer/reset', (req, res) => {
        fs.copySync(utils.getPathForConfig(globalConstants.defaultPrinterSettingsPath), 
            utils.getPathForConfig(globalConstants.printerSettingsPath), { clobber : true });

        printerProxy.send('UpdateSettings');
        res.send();
    });

    return router;
}