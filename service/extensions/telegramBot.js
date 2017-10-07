module.exports = (printerMessageBus) => {
    return;
    const Telegraf = require('telegraf')
    const { Markup, Extra } = require('telegraf')

    const app = new Telegraf('387149745:AAF7xzTEmPJXGLPNPub4JXnfYzOPoahbIOg');
    firstTimeMessage = [];
    allowedChatIds = [282721686];
    adminChatId = 282721686;

    const keyboard = Markup
        .keyboard([['☀️ Датчики', '🏞 Фото'],
                ['🎬 Видео', '⚙️ Настройки']])
        .oneTime(false)
        .resize()
        .extra()

    const videoKeyboardMarkup = Markup.inlineKeyboard([
            Markup.callbackButton('5 сек', 'video:5'),
            Markup.callbackButton('10 сек', 'video:10'),
            Markup.callbackButton('30 сек', 'video:30'),
            Markup.callbackButton('1 мин', 'video:60')
        ])
        .extra()

    app.use((ctx, next) => {

        if (!firstTimeMessage[ctx.chat.id]) {
            console.log(`First request from: ${JSON.stringify(ctx.from)}, chat: ${JSON.stringify(ctx.chat)}`)
            firstTimeMessage[ctx.chat.id] = true;
        }

        for (let i = 0; i < allowedChatIds.length; i++) {
            if (allowedChatIds[i] == ctx.chat.id) {
                return next();
            }
        }

        app.telegram.sendMessage(adminChatId, `⚠️ Отказано в доступе пользователю ${JSON.stringify(ctx.from)}, chat: ${JSON.stringify(ctx.chat)}`);
        return ctx.reply('⚠️ У вас нет доступа для использования этого бота');
    });

    app.hears('☀️ Датчики', (ctx) => {
        let message
        if (latestResult.temperature == undefined || latestResult.humidity == undefined) {
            message = '⚠️ Данных еще нет. Видимо, сервер только что запустился. Попробуйте немножко позже.'
        } else {
            message = `🌡 ${latestResult.temperature.toFixed(2)} °C, 💧 ${latestResult.humidity.toFixed(2)}%`
        }

        ctx.reply(message);
    })

    app.hears('⚙️ Настройки', (ctx) => {
        let message = `Верхняя граница 🌡: *${settings.thresholds.ceil} °C*\n`
        message += `Нижняя граница 🌡: *${settings.thresholds.floor} °C*\n`
        message += `Оповещение при превышении: каждые *${settings.secondsBetweenWarnings} сек*\n`
        message += `Задержка при включении камеры: *${settings.takePhotoDelayInSeconds} сек*`

        ctx.reply(message, Extra.load({parse_mode: 'Markdown'}).markup(Markup.inlineKeyboard([
            Markup.urlButton('Сайт теплички', 'http://greenhouse.mint3d.net:8080/')
        ])))
    })

    app.hears('🏞 Фото', (ctx) => {
        const fileName = 'web-cam-shot.jpg'

        let statusMessageId = null
        app.telegram.sendMessage(ctx.chat.id, '⏳ Фото снимается...')
        .then(result => result.message_id)
        .then((messageId) => {
            return new Promise((resolve, reject) => {
                statusMessageId = messageId

                exec(`fswebcam --jpeg 90 -r 1280x720 -D ${settings.takePhotoDelayInSeconds} ${fileName}`, 
                (error, stdout, stderr) => {
                    if (error) {
                        ctx.reply(`️️⚠️ Ошибка: ${error}, stdout: ${stderr}, stdout: ${stdout}`)
                        .then(resolve);
                    } else {
                        ctx.replyWithPhoto({ source: fileName })
                        .then(resolve);
                    }
                })
            })
        })
        .then(() => {
            app.telegram.deleteMessage(ctx.chat.id, statusMessageId);
        });
    })

    app.hears('🎬 Видео', (ctx) => {
        ctx.reply('🎬 Выберите длительность видео', videoKeyboardMarkup)
    })

    app.on('text', (ctx) => {
        return ctx.reply('Выберите команду', keyboard)
    })

    function sensorDataCallback() {
        let message = `Print end`
        console.log('Telegram > Print end')

        if (message != null) {
            allowedChatIds.forEach(chatId => {
                app.telegram.sendMessage(chatId, message, {parse_mode: 'Markdown'})
            })
            
            lastWarningMessageDateTime = new Date()
        }
    }

    printerMessageBus.on('endPrint', sensorDataCallback)

    app.catch((err) => {
        console.log('Telegram > Error: ', err)
    })

    app.startPolling()
}