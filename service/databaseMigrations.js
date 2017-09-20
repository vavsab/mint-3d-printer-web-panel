const databaseController = require('./controllers/databaseController');
const logger = require('./logger');
const fs = require('fs-extra');
const utils = require('./utils');
const config = require('config');

const migrations = [
    // 0 => 1
    { 
        up: db => {
            return db.collection('configuration').insertOne({key: 'tokenPassword', value: {value: "", expireDate: new Date(0)}});
        } 
    },
    // 1 => 2
    { 
        up: db => {
            const configuration = db.collection('configuration');
            const websiteSettingsKey = 'websiteSettings';

            return configuration.findOne({key: websiteSettingsKey})
            .then(result => {
                if (result == null) {
                    return configuration.insertOne({key: websiteSettingsKey, value: {
                        printerName: 'MINT',
                        dashboardMacrosIds: [1],
                        isPrintingWithBuffer: false,
                        logLevel: 'ALL'
                    }})
                    .then(() => {
                        logger.info('databaseMigrations > Inserted website settings');
                    });
                }
            })
            .then(() => {
                const websiteSettingsFilePath = utils.getPathForConfig('websiteSettings.json');
                const websiteSettingsDefaultFilePath = utils.getPathForConfig('websiteSettingsDefault.json');

                const websiteSettingsDefaultValue = {
                    printerName: null,
                    dashboardMacrosIds : [1, 2, 3],
                    isPrintingWithBuffer: false,
                    logLevel: "ALL"
                };

                let fileExists = fs.existsSync(websiteSettingsFilePath);

                if (fileExists) {
                    let settings = JSON.parse(fs.readFileSync(websiteSettingsFilePath).toString());

                    return configuration.updateOne({ key: websiteSettingsKey }, { $set: { value: settings }})
                    .then(() => logger.info('databaseMigrations > Migrated website settings from file into database'))
                    .then(() => {
                        fs.unlinkSync(websiteSettingsFilePath);

                        if (fs.existsSync(websiteSettingsDefaultFilePath)) {
                            fs.unlinkSync(websiteSettingsDefaultFilePath);
                        }
                        
                        logger.info('databaseMigrations > Removed website settings config files')
                    });
                } else {
                    return configuration.findOne({ key: websiteSettingsKey })
                    .then((websiteSettings) => {
                        if (websiteSettings == null) {
                            return configuration.insertOne({ key: websiteSettingsKey, value: websiteSettingsDefaultValue });
                        }
                    });
                }
            });
        } 
    },
    // 2 => 3
    {
        up: db => {
            const configuration = db.collection('configuration');
            const websiteSettingsKey = 'websiteSettings';

            return configuration.findOne({ key: websiteSettingsKey }).then((websiteSettings) => {
                if (websiteSettings != null) {
                    websiteSettings.value.secondsToShutdownOnPowerOff = 20;

                    return configuration.updateOne({ key: websiteSettingsKey }, websiteSettings);
                }
            })
        }
    },
    // 3 => 4
    {
        up: db => {
            const configuration = db.collection('configuration');
            const websiteSettingsKey = 'websiteSettings';

            return configuration.findOne({ key: websiteSettingsKey }).then((websiteSettings) => {
                if (websiteSettings != null) {
                    websiteSettings.value.isHeatbedAvailable = false;

                    return configuration.updateOne({ key: websiteSettingsKey }, websiteSettings);
                }
            })
        }
    }
];

module.exports.update = () => {
    let configuration;
    let database;

    return databaseController.run((db) => {
        configuration = db.collection('configuration');
        database = db;

        return configuration.findOne({key: 'databaseVersion'})
        .then(result => result == null ? null : result.value)
        .then(databaseVersion => {
            if (databaseVersion == null) {
                databaseVersion = 0;
                configuration.insertOne({key: 'databaseVersion', value: 0})
            }

            let promise = Promise.resolve();
            for (let i = databaseVersion; i < migrations.length; i++) {
                promise = promise
                    .then(() => migrations[i].up(database))
                    .then(() => configuration.updateOne({key: 'databaseVersion'}, { $set: {value: i+1}}))
                    .then(() => logger.info(`databaseMigrations > Successfully updated to version ${i+1}`));
            }

            return promise;
        });
    })                 
}