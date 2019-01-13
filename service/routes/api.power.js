module.exports = (powerController) => {
    const express = require('express');
    const router = express.Router();
    const openRouter = express.Router();

    const config = require('config');
    const isDemo = config.get('isDemo');

    router.post('/power/shutdown', (req, res) => { 
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        powerController.shutdown().then(() => {
            res.send(200);
        }, (err) => {
            res.status(500).json({error: err});
        });
    });

    router.post('/power/safeShutdown', (req, res) => {
        if (isDemo) {
            res.status(400).json({error: 'Forbidden in demo mode'});
            return;
        }

        powerController.safeShutdown().then(() => {
            res.send(200);
        }, (err) => {
            res.status(500).json({error: err});
        });
    });

    openRouter.get('/power/status', (req, res) => { 
        res.json(powerController.getStatus());
    });

    return { router: router, openRouter: openRouter };
}