const mongoClient = require('mongodb').MongoClient;

module.exports.run = (callback) => {
    let database = null;

    return mongoClient.connect('mongodb://localhost:27017/mint3d')
    .then(db => {
        database = db;
        return db;
    })
    .then(() => callback(database))
    .then((result) => database.close().then(() => result));
}