module.exports = function (printerRunner, uploads) {
    var express = require('express');
    var fs = require('fs-extra')
    var commands = require('../commands.json');

    var router = express.Router();

    router.post('/fileUpload', uploads.single("file"), function(req, res) {
        console.log("FILE:" + req.file);
        try {
            fs.copySync(req.file.path, './data.txt', { clobber : true });
            res.status(200).send();
        } catch (error) {
            console.error(error);
            res.status(500).send({error: error});
        }
    });

    router.post('/command/:commandName', function (req, res) {
        console.log("isDirectCommand: " + req.body.isDirectCommand);

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

        console.log("commandCode: " + commandCode);
        if (commandCode != null) {
            printerRunner.send(commandCode + "\n");
            res.status(200).send();
        } else {
            res.status(404).json({ error: "command not found" });
        }
    });

    return router;
}