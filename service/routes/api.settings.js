module.exports = (updateController, networkController, printerProxy) => {
    let express = require('express');
    let fs = require('fs-extra');
    let path = require('path');
    let logger = require('../logger');
    let globalConstants = require('../globalConstants');
    const configurationController = require('../controllers/configurationController');

    let router = express.Router();
    let openRouter = express.Router();

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

    router.get('/settings/network/state', (req, res) => {
        res.json(networkController.getState());
    });

    router.get('/settings/network/wifi', (req, res) => {
        networkController.getWifiAPs()
            .then((result) => res.json(result))
            .catch((err) => res.status(500).json({error: err}));
    });

    router.post('/settings/network/wifi', (req, res) => {
        let apName = req.body.apName;
        let password = req.body.password;

        if (!apName) {
            res.status(400).json({error: 'Name of wifi AP is reqired'});
            return;
        }
        
        networkController.connectToAP(apName, password)
            .then((result) => res.json(result))
            .catch((err) => res.status(500).json({error: err}));
    });

    router.post('/settings/website', (req, res) => {
        let level = req.body.logLevel;
        if (level) {
            logger.setLevel(level);
            printerProxy.setLoggerLevel(level);
            logger.info("Log level was set to " + req.body.logLevel);
        }

        configurationController.get(configurationController.KEY_WEBSITE_SETTINGS)
        .then(websiteSettings => {
            return configurationController.set(configurationController.KEY_WEBSITE_SETTINGS, req.body);
        })
        .then(() => res.send());
    });

    openRouter.get('/settings/website', (req, res) => {
        configurationController.get(configurationController.KEY_WEBSITE_SETTINGS)
        .then(websiteSettings => res.json(websiteSettings));
    });

    return { router: router, openRouter: openRouter };
};