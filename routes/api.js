module.exports = function (printerProcess) {
    var express = require('express');
    var commands = require('../commands.json');

    var router = express.Router();

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
            printerProcess.stdin.write(commandCode + "\n");
            res.status(200).send();
        } else {
            res.status(404).json({ error: "command not found" });
        }
    });

    return router;
}