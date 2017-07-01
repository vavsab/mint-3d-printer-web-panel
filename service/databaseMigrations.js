var mongoClient = require('mongodb').MongoClient;

var migrations = [
    // 0 => 1
    { 
        up: (db) => {
            return db.collection('configuration').insertOne({key: 'tokenPassword', value: {value: "", expireDate: new Date(0)}});
        } 
    }
];

module.exports.update = () => {
    var configuration;
    var database;

    return mongoClient.connect('mongodb://localhost:27017/mint3d').then(db => {
        database = db;
        configuration = db.collection('configuration');
        return configuration.findOne({key: 'databaseVersion'}).then(result => result == null ? null : result.value);
    }).then(databaseVersion => {
        if (databaseVersion == null) {
            databaseVersion = 0;
            configuration.insertOne({key: 'databaseVersion', value: 0})
        }

        let promise = Promise.resolve();
        for (let i = databaseVersion; i < migrations.length; i++) {
            promise = promise
                .then(configuration.updateOne({key: 'databaseVersion'}, { $set: {value: i+1}}))
                .then(migrations[i].up(database));
        }

        return promise;
    }).then(() => database.close());
}
