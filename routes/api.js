﻿module.exports = function (printerProxy, uploads) {
    var express = require('express');
    var fs = require('fs-extra')
    
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
                var errorMessage = 'could not sent the command. Seems that printer is unavailable'; 
                logger.warn(errorMessage);
                res.status(500).json({ error: errorMessage });
            } else {
                res.status(200).send();
            }
        } else {
            res.status(404).json({ error: "command not found" });
        }
    });

    return router;
}