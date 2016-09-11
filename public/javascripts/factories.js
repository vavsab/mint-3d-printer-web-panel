app.factory('siteAvailabilityInterceptor', function($q) {
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
});