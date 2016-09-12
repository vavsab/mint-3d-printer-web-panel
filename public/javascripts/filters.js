app.filter('toTrusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);

app.filter('toFixed', [function(){
    return function(text, fractionDigits) {
        fractionDigits = fractionDigits || 2;
        return text.toFixed(fractionDigits);
    };
}]);

app.filter('replaceIfUndefined', [function(){
    return function(text, replacement) {
        replacement = replacement || '---';
        return text === '' || text === undefined || isNaN(text) ? replacement : text;
    };
}]);

app.filter('dataSize', [function(){
    return function(sizeInBytes) {
        if (!sizeInBytes)
            return sizeInBytes;

        var dimensions = 'B';
        var size = sizeInBytes;
        if (size > 900)
        {
            size /= 1024;
            dimensions = 'KB'
        }

        if (size > 900)
        {
            size /= 1024;
            dimensions = 'MB'
        }

        if (size > 900)
        {
            size /= 1024;
            dimensions = 'GB'
        }

        return size.toFixed(2) + ' ' +  dimensions;
    };
}]);

app.filter('millisecondsToTime', [function() {
    return function (s) {
        if (s == null) return '--:--:--';

        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;

        return putLeadingZeros(hrs, 2) + ':' + putLeadingZeros(mins, 2) + ':' + putLeadingZeros(secs, 2);
    }
}]);