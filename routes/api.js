module.exports = function (printerProxy, printerStatusController, uploads) {
    var express = require('express');
    var fs = require('fs-extra');
    var path = require('path');
    var logger = require('../logger');
    var gcodeAnalyser = require('../gcodeAnalyser');
    var sync = require('sync');
    
    var fileManagerRootPath = fs.realpathSync("files");

    var router = express.Router();

    router.post('/command', function (req, res) {
        var command = req.body.command;

        // process start command path
        if (command.startsWith('start ')) {

            // get file path
            var startFilePath = command.replace('start ', '');

            // remove start slash
            startFilePath = startFilePath.replace(/^[\\\/]/g, '');

            logger.trace('startFilePath: ' + startFilePath);
            startFilePath = fs.realpathSync(path.join(fileManagerRootPath, startFilePath));
            logger.trace('startFilePath: ' + startFilePath);
            if (!startFilePath.startsWith(fileManagerRootPath)) {
                res.status(400).json({ error: "Path violation" });
                return;
            } else {
                command = 'start ' + startFilePath;
            }
        }

        logger.trace("command: " + command);
        if (command != null) {
            var result = printerProxy.send(command);
            if (!result) {
                var errorMessage = 'could not send the command. Seems that printer is unavailable'; 
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

        var fileNames = fs.readdirSync('logs/');
        var totalSize = 0;
        var fileData = [];
        fileNames.forEach(function (fileName) {
            fileData.push({fileName: fileName, size: fs.statSync(path.join('logs/', fileName)).size});
        });

        if (!fileName) {
            res.status(200).json({
                files: fileData, 
            });
        } else {
            res.download(path.join('logs/', fileName));
        }
    });

    // For getting the last printer status
    router.get('/status', function (req, res) {
        res.status(200).json(printerStatusController.currentStatus);
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

    return router;
}