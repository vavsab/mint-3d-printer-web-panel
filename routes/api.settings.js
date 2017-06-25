module.exports = (updateController) => {
    let express = require('express');
    let fs = require('fs-extra');
    let path = require('path');
    let logger = require('../logger');
    let globalConstants = require('../globalConstants');

    let router = express.Router();

    router.get('/settings/update/status', (req, res) => {
        res.send(updateController.getStatus());
    });

    router.get('/settings/update/fetch', (req, res) => {
        updateController.fetch().then((result) => {
            if (result.error) {
                res.status(500);
            }

            res.json(result);
        });
    });

    router.post('/settings/update/pull', (req, res) => {
        updateController.startPull();
        res.send();
    });

    router.post('/settings/update/install', (req, res) => {
        updateController.startInstall();
        res.send();
    });

    return router;
};