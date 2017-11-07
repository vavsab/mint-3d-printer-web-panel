const mongoClient = require('mongodb').MongoClient;
const utils = require('./utils');
const logger = require('./logger');
const moment = require('moment');

const openDb = () => {
     return mongoClient.connect('mongodb://localhost:27017/mint3d');
}

module.exports.getTokenPassword = () => {
    return openDb()
    .then(db => {
        let configuration = db.collection('configuration');
        return configuration.findOne({key: 'tokenPassword'}).then(res => {
            return {tokenPasswordValue: res.value, configuration: configuration};
        });
    }).then(res => {
        let passwordValue = res.tokenPasswordValue;
        
        if (passwordValue.expireDate < new Date()) {
            passwordValue.value = utils.newGuid();
            passwordValue.expireDate = moment().add(1, 'years').toDate(); // give password for a year
            logger.warn(`Authorization > Password for tokens has expires. Generated new password with expire data = ${passwordValue.expireDate}`);
            
            return res.configuration.findOneAndUpdate({key: 'tokenPassword'}, { $set: {value: passwordValue}})
                .then(() => passwordValue.value);
        } else {
            return passwordValue.value;
        }
    });
}