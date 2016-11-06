module.exports = function (printerProxy, printerStatusController, uploads) {
    var express = require('express');
    var fs = require('fs-extra');
    var path = require('path');
    var logger = require('../logger');
    var gcodeAnalyser = require('../gcodeAnalyser');
    var sync = require('sync');
    
    var fileManagerRootPath = fs.realpathSync("files");
    var logsRootPath = fs.realpathSync("logs");

    var router = express.Router();

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

    // For getting the last printer status
    router.get('/status', function (req, res) {
        res.status(200).json(printerStatusController.currentStatus);
    });

    // For getting the last temperature measurements
    router.get('/status/temperature', function (req, res) {
        res.status(200).json(printerStatusController.temperatureChartData);
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

    router.post('/fileManager', uploads.single("file"), function(req, res) {
        logger.trace("fileUpload:" + req.file + ' directory: ' + req.body.directory);
        var folderAbsolutePath = fs.realpathSync(path.join(fileManagerRootPath, req.body.directory));

        if (!folderAbsolutePath.startsWith(fileManagerRootPath)) {
            res.status(400).json({error: 'Path violation'});
        } else {
            fs.copySync(req.file.path, path.join(folderAbsolutePath, req.file.originalname), { clobber : true });
            fs.removeSync(req.file.path);
            res.status(200).send();
        }
    });

    router.post('/fileManager/directory', function(req, res) {
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
            var analyseGcode = function(absolutePath, callback) {
                gcodeAnalyser.self.postMessage = function (message) {
                    if (message.cmd == 'returnModel') {
                        logger.trace('analyseGcode: returnModel');
                        gcodeAnalyser.runAnalyze();
                    }

                    if (message.cmd == 'analyzeDone') {
                        logger.trace('analyseGcode: analyzeDone');
                        callback(null, message.msg);
                    }
                };

                gcodeAnalyser.parseGCode({
                    gcode: fs.readFileSync(absolutePath).toString().split(/\n/),
                    options: {
                        firstReport: 5
                    }
                });
            };
            
            sync(function(){
                var result = analyseGcode.sync(null, absolutePath);
                logger.trace('analyseGcode: done');

                var plaDensity = 1.24;
                result.totalWeight = plaDensity * 3.141 * 1.75 * 1.75 / 10 / 10 / 4 * result.totalFilament / 10;

                res.status(200).json(result);
            });
        }
    });

    var macrosSettingsPath = 'macrosSettings.json';
    var defaultMacrosSettingsPath = 'macrosSettingsDefault.json';

    try {
        fs.statSync(macrosSettingsPath);
    }
    catch (e) {
        fs.copySync(defaultMacrosSettingsPath, macrosSettingsPath);
    }

    router.get('/macros', function (req, res) {
        if (req.id == null) {
            res.json(JSON.parse(fs.readFileSync(macrosSettingsPath).toString()));
        }
    });

    router.post('/macros/:id', function (req, res) {
        macrosList = JSON.parse(fs.readFileSync(macrosSettingsPath).toString());
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

        fs.writeFileSync(macrosSettingsPath, JSON.stringify(macrosList));
        res.send();
    });

    router.delete('/macros/:id', function (req, res) {
        macrosList = JSON.parse(fs.readFileSync(macrosSettingsPath).toString());

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
            fs.writeFileSync(macrosSettingsPath, JSON.stringify(macrosList));
        } else {
            res.status(404);
        }

        res.send();
    });

    var websiteSettingsPath = 'websiteSettings.json';
    var defaultWebsiteSettingsPath = 'websiteSettingsDefault.json';
    try {
        fs.statSync(websiteSettingsPath);
    }
    catch (e) {
        fs.copySync(defaultWebsiteSettingsPath, websiteSettingsPath);
    }

    router.get('/settings/website', function (req, res) {
         res.json(JSON.parse(fs.readFileSync(websiteSettingsPath).toString()));
    });

    router.post('/settings/website', function (req, res) {
        fs.writeFileSync(websiteSettingsPath, JSON.stringify(req.body));
        res.send();
    });

    var printerSettingsPath = 'printerSettings.cfg';
    var defaultPrinterSettingsPath = 'printerSettingsDefault.cfg';
    try {
        fs.statSync(printerSettingsPath);
    }
    catch (e) {
        fs.copySync(defaultPrinterSettingsPath, printerSettingsPath);
    }

    router.get('/settings/printer', function (req, res) {
        var result = "{";
        fs.readFileSync(printerSettingsPath).toString().split(/\n/)
        .forEach(function (line) {
            var keyValue = line.split(' ');
            if (keyValue.length != 2)
                return;

            result += '"' + keyValue[0] + '":' + keyValue[1] + ',';
        });

        result = result.replace(/,\s*$/, ''); // remove last comma
        result += "}";

        res.json(JSON.parse(result));
    });

    router.post('/settings/printer', function (req, res) {
        var result = '';
        var settings = req.body;
        for (var property in settings) {
            if (settings.hasOwnProperty(property)) {
                result += property + ' ' + settings[property] + '\n';  
            }
        }

        fs.writeFileSync(printerSettingsPath, result);
        printerProxy.send('UpdateSettings');
        res.send();
    });

    router.post('/settings/printer/reset', function (req, res) {
        fs.copySync(defaultPrinterSettingsPath, printerSettingsPath, { clobber : true });
        printerProxy.send('UpdateSettings');
        res.send();
    });

    return router;
}