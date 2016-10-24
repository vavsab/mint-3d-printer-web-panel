app = angular.module('angularModule', 
    ['ngRoute', 'route-segment', 'view-segment', 'ui.bootstrap', 'ngFileUpload', 'ngResource', 'LocalStorageModule']);

app.config(['$routeSegmentProvider', function ($routeSegmentProvider) {
    $routeSegmentProvider
        .when('/', 'main')
        .when('/fileManager', 'fileManager')
        .when('/macros', 'macros')
        .when('/logs', 'logs')
        .when('/settings','settings.dashboard')
        .when('/settings/dashboard','settings.dashboard')
        .when('/settings/printer','settings.printer')

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
            templateUrl: 'partials/logs.html',
            controller: 'logsController'
        })
        .segment('settings', {
            templateUrl: 'partials/settings.html'
        })
        .within()
            .segment('dashboard', {
                templateUrl: 'partials/settings.dashboard.html',
                controller: 'settingsDashboardController'
            })
            .segment('printer', {
                templateUrl: 'partials/settings.printer.html',
                controller: 'settingsPrinterController'
            })
        .up();
}]);

app.config(function($httpProvider) {
    $httpProvider.interceptors.push('siteAvailabilityInterceptor');
});

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