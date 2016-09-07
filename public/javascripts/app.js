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

app.filter('to_trusted', ['$sce', function($sce){
        return function(text) {
            return $sce.trustAsHtml(text);
        };
    }]);


String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};