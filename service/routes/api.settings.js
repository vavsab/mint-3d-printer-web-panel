module.exports = (updateController, networkController, printerProxy, botController) => {
    const express = require('express');
    const fs = require('fs-extra');
    const path = require('path');
    const logger = require('../logger');
    const globalConstants = require('../globalConstants');
    const configurationController = require('../controllers/configurationController');
    const supportController = require('../controllers/supportController');
    const config = require('config');
    const isDemo = config.get('isDemo');

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
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        updateController.startPull();
        res.send();
    });

    router.post('/settings/update/install', (req, res) => {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        updateController.startInstall();
        res.send();
    });

    router.get('/settings/network/state', (req, res) => {
        res.json(networkController.getState());
    });

    router.get('/settings/network/wifi', (req, res) => {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }
        
        networkController.getWifiAPs()
            .then((result) => res.json(result))
            .catch((err) => res.status(500).json({error: err}));
    });

    router.post('/settings/network/wifi', (req, res) => {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

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
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

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

    router.get('/settings/support', (req, res) => {
        supportController.isConnected()
        .then((isConnected) => res.send(isConnected), 
            (error) => {
                res.status(500).json({error: error});
            });
    });

    router.post('/settings/support/connect', (req, res) => {
        supportController.connect(req.body.message)
        .then(() => res.send(), 
            (error) => {
                res.status(500).json({error: error});
            });
    });

    router.post('/settings/support/disconnect', (req, res) => {
        supportController.disconnect()
        .then(() => res.send(), 
            (error) => {
                res.status(500).json({error: error});
            });
    });

    router.get('/settings/bot', (req, res) => {
        botController.getSettings()
        .then(botSettings => {
            res.json(botSettings);
        })
    });

    router.post('/settings/bot', (req, res) => {
        botController.setSettings(req.body.botSettings)
        .then(() => res.send());
    });

    return { router: router, openRouter: openRouter };
};