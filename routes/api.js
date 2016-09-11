module.exports = function (printerProxy, printerStatusController, uploads) {
    var express = require('express');
    var fs = require('fs-extra');
    var path = require('path');
    
    var commands = require('../commands.json');
    var logger = require('../logger');

    var router = express.Router();

    router.post('/fileUpload', uploads.single("file"), function(req, res) {
        logger.info("FILE:" + req.file);
        try {
            fs.copySync(req.file.path, './data.txt', { clobber : true });
            res.status(200).send();
        } catch (error) {
            logger.error(error);
            res.status(500).send({error: error});
        }
    });

    router.post('/command/:commandName', function (req, res) {
        logger.info("isDirectCommand: " + req.body.isDirectCommand);
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

        logger.info("commandCode: " + commandCode);
        if (commandCode != null) {
            var result = printerProxy.send(commandCode + "\n");
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

    return router;
}