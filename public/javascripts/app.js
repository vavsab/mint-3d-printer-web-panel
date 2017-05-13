app = angular.module('angularModule', 
    ['ngRoute', 'route-segment', 'view-segment', 'ui.bootstrap', 'ngFileUpload', 
    'ngAnimate', 'ngResource', 'LocalStorageModule',
    'ng-virtual-keyboard', 'chart.js', 'ngCookies']);

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
        .when('/temperature', 'temperature')
        .when('/speed', 'speed')
        .when('/logs', 'logs.general')
        .when('/logs/printer', 'logs.printer')
        .when('/settings', 'settings')
        .when('/settings/change-password', 'settings_change-password')
        .when('/settings/browser', 'settings_browser')
        .when('/settings/server', 'settings_server')
        .when('/settings/printer', 'settings_printer')
        .when('/settings/printer/z-index', 'settings_printer_z-index')
        .when('/settings/printer/extruder', 'settings_printer_extruder')
        .when('/settings/printer/advanced', 'settings_printer_advanced')

        .segment('lockScreen', {
            templateUrl: 'partials/lockScreen.html',
            controller: 'lockScreenController as $ctrl'
        })
        .segment('main', {
            templateUrl: 'partials/dashboard.html',
            controller: 'dashboardController'
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
            templateUrl: 'partials/settings.browser.html',
            controller: 'settingsBrowserController as $ctrl'
        })
        .segment('settings_change-password', {
            templateUrl: 'partials/settings.change-password.html',
            controller: 'settingsChangePasswordController as $ctrl'
        })
        .segment('settings_server', {
            templateUrl: 'partials/settings.server.html',
            controller: 'settingsServerController as $ctrl'
        })
        .segment('settings_printer', {
            templateUrl: 'partials/settings.printer.html'
        })
        .segment('settings_printer_z-index', {
            templateUrl: 'partials/settings.printer.z-index.html',
            controller: 'settingsPrinterZIndexController as $ctrl'
        })
        .segment('settings_printer_extruder', {
            templateUrl: 'partials/settings.printer.extruder.html',
            controller: 'settingsPrinterExtruderController as $ctrl'
        })
        .segment('settings_printer_advanced', {
            templateUrl: 'partials/settings.printer.advanced.html',
            controller: 'settingsPrinterAdvancedController as $ctrl'
        });

    $routeProvider.otherwise({redirectTo: '/lockScreen'}); 
}]);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('siteAvailabilityInterceptor');
    $httpProvider.interceptors.push('tokenErrorInterceptor');
}]);

app.value('loader', {show: true});
app.value('printerStatus', {status: {}, isLocked: false});
app.value('browserSettings', {showVirtualKeyboard: false, isDarkTheme: false});
app.value('websiteSettings', {settings: {}, defaultPrinterName: 'Keep Calm Printer'});

app.factory('httpq', ['$http', '$q', function($http, $q) {
  return {
    get: function() {
      var deferred = $q.defer();
      $http.get.apply(null, arguments)
        .success(deferred.resolve)
        .error(deferred.reject);

      return deferred.promise;
    },
    post: function() {
      var deferred = $q.defer();
      $http.post.apply(null, arguments)
        .success(deferred.resolve)
        .error(deferred.reject);

      return deferred.promise;
    }
  };
}]);