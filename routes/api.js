module.exports = function (printerProcess) {
    var express = require('express');
    var commands = require('../commands.json');

    var router = express.Router();

    router.post('/command/:commandName', function (req, res) {
        console.log("command: " + req.params.commandName);
        var command = commands.find(function (value, index, array) {
            return value.commandName === req.params.commandName;   
        });

        if (command != null) {
            printerProcess.stdin.write(command.commandCode + "\n");
            res.status(200).send();
        } else {
            res.status(404).json({ error: "command not found" });
        }
    });

    return router;
}