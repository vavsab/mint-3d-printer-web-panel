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
    },
    delete: function() {
      var deferred = $q.defer();
      $http.delete.apply(null, arguments)
        .success(deferred.resolve)
        .error(deferred.reject);

      return deferred.promise;
    }
  };
}]);