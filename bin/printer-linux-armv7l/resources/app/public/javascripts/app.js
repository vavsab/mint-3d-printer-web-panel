﻿app = angular.module('angularModule', 
    ['ngRoute', 'route-segment', 'view-segment', 'ui.bootstrap', 'ngFileUpload', 
    'ngAnimate', 'ngResource', 'LocalStorageModule',
    'ng-virtual-keyboard', 'chart.js', 'ngCookies', 'gettext',
    'frapontillo.bootstrap-switch']);

app.run(['gettextCatalog', function (gettextCatalog) {
    // var lang = 'en_US';
    // gettextCatalog.setCurrentLanguage(lang);
    // gettextCatalog.loadRemote('/i18n/' + lang + '.json');
}]);

app.config(['$routeSegmentProvider', '$routeProvider', function ($routeSegmentProvider, $routeProvider) {
    $routeSegmentProvider.options.autoLoadTemplates = true;

    $routeSegmentProvider
        .when('/lockScreen', 'lockScreen')
        .when('/', 'main')
        .when('/fileManager', 'fileManager')
        .when('/macros', 'macros')
        .when('/console', 'console')
        .when('/status', 'status')
        .when('/movements', 'movements')
        .when('/fan', 'fan')
        .when('/temperature', 'temperature.hotend')
        .when('/temperature/bed', 'temperature.bed')
        .when('/speed', 'speed')
        .when('/logs', 'logs.general')
        .when('/logs/printer', 'logs.printer')
        .when('/settings', 'settings')
        .when('/settings/change-password', 'settings_change-password')
        .when('/settings/browser', 'settings_browser')
        .when('/settings/server', 'settings_server')
        .when('/settings/printer', 'settings_printer')
        .when('/settings/update', 'settings_update')
        .when('/settings/network', 'settings_network')
        .when('/settings/support', 'settings_support')
        .when('/settings/bot', 'settings_bot')
        .when('/settings/printer/z-index', 'settings_printer_z-index')
        .when('/settings/printer/extruder', 'settings_printer_extruder')
        .when('/settings/printer/advanced', 'settings_printer_advanced')
        .when('/settings/printer/configuration', 'settings_printer_configuration')

        .segment('lockScreen', {
            templateUrl: 'partials/lockScreen.html',
            controller: 'lockScreenController as $ctrl'
        })
        .segment('main', {
            templateUrl: 'partials/dashboard.html',
            controller: 'dashboardController as $ctrl'
        })
        .segment('fileManager', {
            templateUrl: 'partials/fileManager.html',
            controller: 'fileManagerController'
        })
        .segment('macros', {
            templateUrl: 'partials/macros.html',
            controller: 'macrosController'
        })
        .segment('movements', {
            templateUrl: 'partials/regulations/movements.html',
            controller: 'movementsController as $ctrl'
        })
        .segment('fan', {
            templateUrl: 'partials/regulations/fan.html',
            controller: 'fanController as $ctrl'
        })
        .segment('temperature', {
            templateUrl: 'partials/regulations/temperature.html',
            controller: 'temperatureController as $ctrl'
        })
        .within()
            .segment('hotend', {
                templateUrl: 'partials/regulations/temperature/hotend.html',
                controller: 'temperatureHotendController as $ctrl'
            })
            .segment('bed', {
                templateUrl: 'partials/regulations/temperature/bed.html',
                controller: 'temperatureBedController as $ctrl'
            })
        .up()
        .segment('speed', {
            templateUrl: 'partials/regulations/speed.html',
            controller: 'speedController as $ctrl'
        })
        .segment('logs', {
            templateUrl: 'partials/logs.html'
        })
        .within()
            .segment('general', {
                templateUrl: 'partials/logs.general.html',
                controller: 'logsController as $ctrl'
            })
            .segment('printer', {
                templateUrl: 'partials/logs.printer.html',
                controller: 'printerLogsController as $ctrl'
            })
        .up()
        .segment('console', {
            templateUrl: 'partials/console.html',
            controller: 'consoleController as $ctrl'
        })
        .segment('status', {
            templateUrl: 'partials/status.html',
        })
        .segment('settings', {
            templateUrl: 'partials/settings.html',
        })
        .segment('settings_browser', {
            templateUrl: 'partials/settings/browser.html',
            controller: 'settingsBrowserController as $ctrl'
        })
        .segment('settings_change-password', {
            templateUrl: 'partials/settings/change-password.html',
            controller: 'settingsChangePasswordController as $ctrl'
        })
        .segment('settings_server', {
            templateUrl: 'partials/settings/server.html',
            controller: 'settingsServerController as $ctrl'
        })
        .segment('settings_printer', {
            templateUrl: 'partials/settings/printer.html'
        })
        .segment('settings_update', {
            templateUrl: 'partials/settings/update.html',
            controller: 'settingsUpdateController as $ctrl'
        })
        .segment('settings_network', {
            templateUrl: 'partials/settings/network.html',
            controller: 'settingsNetworkController as $ctrl'
        })
        .segment('settings_support', {
            templateUrl: 'partials/settings/support.html',
            controller: 'settingsSupportController as $ctrl'
        })
        .segment('settings_bot', {
            templateUrl: 'partials/settings/bot.html',
            controller: 'settingsBotController as $ctrl'
        })
        .segment('settings_printer_z-index', {
            templateUrl: 'partials/settings/printer/z-index.html',
            controller: 'settingsPrinterZIndexController as $ctrl'
        })
        .segment('settings_printer_extruder', {
            templateUrl: 'partials/settings/printer/extruder.html',
            controller: 'settingsPrinterExtruderController as $ctrl'
        })
        .segment('settings_printer_advanced', {
            templateUrl: 'partials/settings/printer/advanced.html',
            controller: 'settingsPrinterAdvancedController as $ctrl'
        })
        .segment('settings_printer_configuration', {
            templateUrl: 'partials/settings/printer/configuration.html',
            controller: 'settingsPrinterConfigurationController as $ctrl'
        });

    $routeProvider.otherwise({redirectTo: '/'}); 
}]);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('siteAvailabilityInterceptor');
    $httpProvider.interceptors.push('tokenErrorInterceptor');
}]);

app.value('loader', {show: true});
app.value('socket', io.connect());
app.value('sizeCoeff', 100000); // Determines how many units contains 1 millimeter in hardware representation
app.value('printerStatus', {status: {}, isLocked: false});
app.value('browserSettings', {showVirtualKeyboard: false, isDarkTheme: true});
app.value('websiteSettings', {settings: null, defaultPrinterName: 'MINT printer'});