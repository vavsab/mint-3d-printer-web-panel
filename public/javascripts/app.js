app = angular.module('angularModule', ['ngRoute', 'ui.bootstrap', 'ngFileUpload', 'ngResource'])
    .config(['$routeProvider', function ($routeProvider) {
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