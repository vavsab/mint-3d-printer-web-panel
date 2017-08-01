const databaseController = require('./databaseController');

let self = module.exports;

self.KEY_WEBSITE_SETTINGS = 'websiteSettings';

self.get = (key) => 
    databaseController.run(db => db.collection('configuration').findOne({ key: key }).then((config) => {
        if (config != null) {
            return config.value;
        } else {
            return null;
        }
    }));

self.set = (key, value) => 
    databaseController.run(db => 
        db.collection('configuration').updateOne({ key: key }, { $set: { value: value }}));