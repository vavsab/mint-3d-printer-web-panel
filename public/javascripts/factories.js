app.factory('siteAvailabilityInterceptor', ['$q', function($q) {
    var self = this;
    this.responseError = function(rejection) {
        if(rejection.status <= 0) {
            if (self.onError) {
                self.onError();
            }

            return;
        }

        return $q.reject(rejection);
    };

    return this;
}]);

app.factory('tokenErrorInterceptor', ['$q', function($q) {
    var self = this;
    this.responseError = function(rejection) {
        if(rejection.status == 403) {
            if (self.onError) {
                self.onError();
            }

            return;
        }

        return $q.reject(rejection);
    };

    return this;
}]);