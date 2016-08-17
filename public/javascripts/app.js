app = angular.module('angularModule', ['ngRoute'])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.
            when('/main', {
                templateUrl: 'partials/main.html'
            }).
            when('/fileManager', {
                templateUrl: 'partials/fileManager.html'
            }).
            otherwise({ redirectTo: '/main' });
    }]);