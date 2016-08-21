app = angular.module('angularModule', ['ngRoute', 'ui.bootstrap'])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.
            when('/', {
                templateUrl: 'partials/dashboard.html',
                controller: 'DashboardController'
            }).
            when('/fileManager', {
                templateUrl: 'partials/fileManager.html'
            }).
            otherwise({ redirectTo: '/' });
    }]);