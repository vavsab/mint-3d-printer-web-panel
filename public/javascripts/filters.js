app.filter('toTrusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);

app.filter('replaceIfUndefined', [function(){
    return function(text, replacement = '---') {
        return text == '' || text == undefined || isNaN(text) ? replacement : text;
    };
}]);