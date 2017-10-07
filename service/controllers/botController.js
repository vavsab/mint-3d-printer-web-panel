const configurationController = require('./configurationController');
const databaseController = require('./databaseController');
const Telegraf = require('telegraf');
const logger = require('../logger');
const { Markup, Extra } = require('telegraf');

module.exports = (printerMessageBus) => {
    let self = this;

    self.getSettings = () => {
        return configurationController.get('botSettings')
            .then(botSettings => {
                // Do not let the user read the token. He can only change it.
                botSettings.token = null;

                let notificationTranslations = [
                    { id: 'printStart', title: 'Printing started' },
                    { id: 'printEnd', title: 'Printing ended'},
                    { id: 'unauthorizedBotAccess', title: 'Unauthorized bot access' }
                ];

                // Translate notifications
                botSettings.notifications.forEach(notification => {
                    let translation = notificationTranslations.find(t => t.id == notification.id);
                    
                    if (translation) {
                        notification.title = translation.title;
                    } else {
                        notification.title = notification.id;
                    }
                });

                return botSettings;
            });
    };

    self.setSettings = (botSettings) => {
        return configurationController.get('botSettings')
        .then(currentBotSettings => {
            if (botSettings.token == null || botSettings.token.trim() == '') {
                botSettings.token = currentBotSettings.token;
            }

            // Do not save translations
            botSettings.notifications.forEach(notification => {
                delete notification.title;
            });

            return configurationController.set('botSettings', botSettings).then(() => reloadBot());
        });
    };

    let botApp = null;

    function getUserIdsByNames(names) {
        return Promise.all(names.map(username => {
            return databaseController.run(db => {
                let mappingCollection = db.collection('telegramUserNameToIdMapping');

                return mappingCollection.findOne({name: username})
                    .then(mapping => {
                        if (mapping == null) {
                            logger.warn(`Telegram bot > Could not find id for user '${username}'`);
                            return { name: username, id: null };
                        }

                        return { name: username, id: mapping.id };
                    });
            });
        }));
    }

    let app = null;

    function reloadBot() {
        return new Promise(resolve => {
            if (app != null) {
                app.stop(() => {
                    app = null;
                    resolve();
                });
            } else {
                resolve();
            }
        })
        .then(() => configurationController.get('botSettings'))
        .then(botSettings => {

            let getUserIdsToNotify = (notificationId) => {
                let notificationInfo = botSettings.notifications.find(n => n.id == notificationId);
                    if (!notificationInfo.isEnabled)
                        return Promise.resolve([]);

                    let userNamesToNotify = botSettings.users
                        .filter(u => u.isEnabled && (u.isAdmin || !notificationInfo.isForAdminsOnly))
                        .map(u => u.name);
        
                    return getUserIdsByNames(userNamesToNotify).then((mappings) =>
                        Promise.all(mappings.filter(m => m.id != null).map(m => m.id)));
            }
            
            if (!botSettings.isEnabled)
                return;

            app = new Telegraf(botSettings.token);

            const keyboard = Markup
                .keyboard(['📊 Статус'])
                .oneTime(false)
                .resize()
                .extra()

            app.use((ctx, next) => {
                return databaseController.run(db => {
                    let = mappingCollection = db.collection('telegramUserNameToIdMapping');

                    return mappingCollection.findOne({ name: ctx.chat.username }).then((mapping) => {
                        if (mapping == null) {
                            logger.info(`Telegram bot > First request from: ${JSON.stringify(ctx.from)}, chat: ${JSON.stringify(ctx.chat)}`);
                            mapping = { name: ctx.chat.username, id: ctx.chat.id };
                            return mappingCollection.insertOne(mapping);
                        }
                    });
                })
                .then(() => {
                    if (!botSettings.users.some(u => u.name == ctx.chat.username)) {
                        botSettings.users.push({name: ctx.chat.username, isEnabled: false, isAdmin: false});
                        return self.setSettings(botSettings);
                    }
                })
                .then(() => {
                    // Block disabled users
                    if (botSettings.users.some(u => u.isEnabled && u.name == ctx.chat.username))
                        return next();
                    else 
                        return ctx.reply('⚠️ У вас нет доступа для использования этого бота');
                    
                    // Notify about unauthorized access
                    return getUserIdsToNotify('unauthorizedBotAccess')
                    .then(userIds => 
                        Promise.all(userIds.map(id =>
                            app.telegram.sendMessage(id, `⚠️ Отказано в доступе пользователю ${ctx.from.first_name} ${ctx.from.last_name} (${ctx.from.username})`)
                        ))
                    );
                });
            });

            app.hears('📊 Статус', (ctx) => {
                ctx.reply('Еще не реализовано');
            })

            app.on('text', (ctx) => {
                return ctx.reply('Выберите команду', keyboard)
            })

            function onEndPrint() {
                return getUserIdsToNotify('printEnd')
                    .then(userIds => 
                        Promise.all(userIds.map(id =>
                            app.telegram.sendMessage(id, `✅ Печать завершена`)
                        ))
                    );
            }

            printerMessageBus.on('endPrint', onEndPrint)

            app.catch((err) => {
                logger.warn('Telegram bot > Error: ', err)
            })

            app.startPolling();
        });    
    }
    
    reloadBot();

    return self;
}