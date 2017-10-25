# README #

Web site of printer

## How to build ##

1. Go to `desktop-loader` folder and build it first. Read README file there.
2. `npm install`
3. `gulp clean`
4. `gulp build`
    OR for testing: `gulp build --dev`

## How to run on Windows test environment ##

1. Install MongoDB (You can configure it to startup as a service: https://stackoverflow.com/questions/2438055/how-to-run-mongodb-as-windows-service)
2. Install NodeJS
3. `npm start` will start printer emulator and web site
4. Go to http://localhost:3123

## Билд локализации ##
1. Отредактировать файлы *.po.
2. `gulp i18n` - выполняет две подзадачи: вытаскивает все строки для перевода из кода и запихивает все в json файлы для сайта.
Если не надо вытаскивать все строки (это долгая операция), а нужно просто обновить перевод, то можно вызвать `gulp i18n_compile`