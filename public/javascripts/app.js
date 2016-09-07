app = angular.module('angularModule', ['ngRoute', 'ui.bootstrap'])
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
            when('/commands', {
                templateUrl: 'partials/commands.html'
            }).
            when('/logs', {
                templateUrl: 'partials/logs.html',
                controller: 'logsController'
            }).
            otherwise({ redirectTo: '/' });
    }]);    