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
        .when('/logs', 'logs.general')
        .when('/logs/printer', 'logs.printer')
        .when('/settings','settings.general')
        .when('/settings/console','settings.console')
        .when('/settings/printer','settings.printer')

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
        .segment('settings', {
            templateUrl: 'partials/settings.html'
        })
        .within()
            .segment('general', {
                templateUrl: 'partials/settings.general.html',
                controller: 'settingsGeneralController as $ctrl'
            })
            .segment('console', {
                templateUrl: 'partials/settings.console.html',
                controller: 'settingsConsoleController as $ctrl'
            })
            .segment('printer', {
                templateUrl: 'partials/settings.printer.html',
                controller: 'settingsPrinterController as $ctrl'
            })
        .up();

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