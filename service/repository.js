const mongoClient = require('mongodb').MongoClient;
const utils = require('./utils');
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
            passwordValue.expireDate = moment().add(365, 'days').toDate(); // give password for a year
            
            return res.configuration.findOneAndUpdate({key: 'tokenPassword'}, { $set: {value: passwordValue}})
                .then(() => passwordValue.value);
        } else {
            return passwordValue.value;
        }
    });
}