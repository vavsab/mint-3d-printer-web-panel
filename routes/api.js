module.exports = function (printerProxy, printerStatusController, uploads) {
    var express = require('express');
    var fs = require('fs-extra');
    var path = require('path');
    
    var commands = require('../commands.json');
    var logger = require('../logger');
    
    var rootFilePath = "files";
    var rootAbsolutePath = fs.realpathSync(rootFilePath);

    var router = express.Router();

    router.post('/command/:commandName', function (req, res) {
        logger.trace("isDirectCommand: " + req.body.isDirectCommand);
        var commandCode = null;
        if (req.body.isDirectCommand) {
            commandCode = req.params.commandName;
        } else {
            var command = commands.find(function (value, index, array) {
                return value.commandName === req.params.commandName;   
            });

            if (command != null) {
                commandCode = command.commandCode;
            }
        }

        logger.trace("commandCode: " + commandCode);
        if (commandCode != null) {
            var result = printerProxy.send(commandCode);
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
        var currentFolderAbsolutePath = fs.realpathSync(path.join(rootFilePath, req.query.path));
        if (!currentFolderAbsolutePath.startsWith(rootAbsolutePath)) {
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
        var fileAbsolutePath = fs.realpathSync(path.join(rootFilePath, req.query.path));
        if (!fileAbsolutePath.startsWith(rootAbsolutePath)) {
            res.status(400).json({error: 'Path violation'});
        } else {
            fs.unlinkSync(fileAbsolutePath);
            res.status(200).send();
        }
    });

    router.post('/fileManager', uploads.single("file"), function(req, res) {
        logger.trace("fileUpload:" + req.file + ' directory: ' + req.body.directory);
        var folderAbsolutePath = fs.realpathSync(path.join(rootFilePath, req.body.directory));

        if (!folderAbsolutePath.startsWith(rootAbsolutePath)) {
            res.status(400).json({error: 'Path violation'});
        } else {
            fs.copySync(req.file.path, path.join(folderAbsolutePath, req.file.originalname), { clobber : true });
            res.status(200).send();
        }
    });

    return router;
}