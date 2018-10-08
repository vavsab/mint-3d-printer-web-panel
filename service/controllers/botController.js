const configurationController = require('./configurationController');
const databaseController = require('./databaseController');
const Telegraf = require('telegraf');
const logger = require('../logger');
const moment = require('moment');
const { Markup, Extra } = require('telegraf');
const PiCamera = require('pi-camera');
const myCamera = new PiCamera({
    mode:'photo',
    output: '/photo.jpg',
    width: 1920,
    height: 1080,
    nopreview: true
});

module.exports = (printerMessageBus, printerStatusController) => {
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
                    // Wait for longpoiling to finish
                    logger.info('botController > Bot is stopped. Waiting 30 sec to finish last polling request...');
                    setTimeout(() => resolve(), 1000 * 30);
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

            if (app == null) {
                app = new Telegraf();

                const keyboard = Markup
                .keyboard(['📊 Статус','📷 Photo'])
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

                        return ctx.reply('⚠️ У вас нет доступа для использования этого бота')
                        .then(() => getUserIdsToNotify('unauthorizedBotAccess'))
                        .then(userIds => {
                            return Promise.all(userIds.map(id =>
                                app.telegram.sendMessage(id, `⚠️ Отказано в доступе пользователю ${ctx.from.first_name} ${ctx.from.last_name} (${ctx.from.username})`)
                            ));
                        });
                    });
                });

                function getSensorsMessageParts() {
                    let messageParts = [];
                    let status = printerStatusController.currentStatus;
                    let temp = status.temp / 10;
                    let targetTemp = status.baseTemp / 10;                        
                    if (temp != null && targetTemp != null){
                        messageParts.push(`🌡 *Нагреватель*: ${temp.toFixed(0)} / ${targetTemp.toFixed(0)} °C`); 
                    }

                    let fan = status.cullerRate / 2550 * 100;
                    if (fan) {
                        messageParts.push(`🚿 *Охладитель*: ${fan.toFixed(0)}%`);
                    }

                    return messageParts;
                }

                function getFileMessagePart() {
                    let messageParts = [];
                    let status = printerStatusController.currentStatus;
                    if (status.fileName) {
                        messageParts.push(`🖨 *Файл*: \`${status.fileName}\``);
                    }

                    return messageParts;
                }

                app.hears('📊 Статус', (ctx) => {
                    let status = printerStatusController.currentStatus;
                    let messageParts = [];
                    if (['Printing', 'PrintBuffering'].indexOf(status.state) != -1){
                        getFileMessagePart().forEach(m => messageParts.push(m));
                        messageParts.push(`📊 *Прогресс*: ${(status.line_index / status.line_count * 100).toFixed(2)}%`);
                        messageParts.push(`⚡️ *Старт*: ${moment(status.startDate).format('HH:ss DD.MM')}`);
                        messageParts.push(`🎇 *Позиция Z*:${(status.currentPos.Z / 100000).toFixed(2)}`);

                        if (status.remainedMilliseconds) {
                            let remainingText = null;
                            let seconds = `${parseInt(status.remainedMilliseconds / 1000) % 60} сек`;
                            let minutes = `${parseInt(status.remainedMilliseconds / 1000 / 60) % 60} мин`;
                            let hours = `${parseInt(status.remainedMilliseconds / 1000 / 60 / 60)} час`;
                            if (status.remainedMilliseconds < 1000 * 60) {
                                remainingText = `${seconds}`;
                            } 
                            else if (status.remainedMilliseconds < 1000 * 60 * 60) {
                                remainingText = `${minutes} ${seconds}`;
                            }
                            else {
                                remainingText = `${hours} ${minutes} ${seconds}`;
                            }

                            messageParts.push(`🕐 *Осталось*: ${remainingText}`);
                            messageParts.push(`🏁 *Завершение*: ${moment(status.endDate).format('HH:ss DD.MM')}`);;
                        } else {
                            messageParts.push(`🕐 *Время завершения* рассчитывается...`);;
                        }
                    } else {
                        messageParts.push(`☑️ Принтер находится в режиме '${status.state}'`);
                    }

                    getSensorsMessageParts().forEach(m => messageParts.push(m));

                    ctx.reply(messageParts.join('\n'), {parse_mode: 'Markdown'});
                })

                app.hears('📷 Photo', (ctx) => {
                    myCamera.snap()
                    .then((result) =>{
                        ctx.replyWithPhoto({ source: '/photo.jpg' })
                    })
                    .catch((error) => {
                        return ctx.reply(error);
                    })
                })

                app.on('text', (ctx) => {
                    return ctx.reply('❓ Выберите команду', keyboard)
                })

                function onEndPrint() {
                    return getUserIdsToNotify('printEnd')
                        .then(userIds => 
                            Promise.all(userIds.map(id => {
                                let messageParts = [];
                                messageParts.push('✅ Печать завершена');

                                getFileMessagePart().forEach(m => messageParts.push(m));
                                getSensorsMessageParts().forEach(m => messageParts.push(m));
                                
                                return app.telegram.sendMessage(id, messageParts.join('\n'), {parse_mode: 'Markdown'});
                            }))
                        );
                }

                printerMessageBus.on('endPrint', onEndPrint)

                app.catch((err) => {
                    logger.warn('Telegram bot > Error: ', err)
                })
            }

            app.token = botSettings.token;
            logger.info('botController > Starting bot..');
            app.startPolling();
        });    
    }
    
    reloadBot();

    return self;
}