app = angular.module('angularModule', ['ngRoute', 'ui.bootstrap', 'ngFileUpload', 'ngResource', 'LocalStorageModule']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.
        when('/', {
            templateUrl: 'partials/dashboard.html',
            controller: 'dashboardController'
        }).
        when('/fileManager', {
            templateUrl: 'partials/fileManager.html',
            controller: 'fileManagerController'
        }).
        when('/macros', {
            templateUrl: 'partials/macros.html',
            controller: 'macrosController'
        }).
        when('/logs', {
            templateUrl: 'partials/logs.html',
            controller: 'logsController'
        }).
        when('/settings', {
            templateUrl: 'partials/settings.html',
            controller: 'settingsController'
        }).
        otherwise({ redirectTo: '/' });
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