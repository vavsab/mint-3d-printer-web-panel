app.filter('toTrusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);

app.filter('toStatusText', ['gettextCatalog', function(gettextCatalog){
    return function(status) {        
        switch (status) {
            case 'CopyData':
                return gettextCatalog.getString('Copying data');
            case 'CopyDataBuffer':
                return gettextCatalog.getString('Copying (buffer)');
            case 'PauseBuffering':
                return gettextCatalog.getString('Buffering paused');
            case 'PrintBuffering':
                return gettextCatalog.getString('Buffering');
            case 'Printing':
                return gettextCatalog.getString('Printing');
            case 'Pause':
                return gettextCatalog.getString('Paused');
            case 'PausePrintBuffering':
                return gettextCatalog.getString('Paused (buffer)');
            case 'Idle':
                return gettextCatalog.getString('Idle');
            default:
                return status;
        }
    };
}]);

app.filter('toFixed', [function(){
    return function(text, fractionDigits) {
        if (text == null)
            return text;

        fractionDigits = fractionDigits || 2;
        return text.toFixed(fractionDigits);
    };
}]);

app.filter('toDate', [function(){
    return function(text) {
        var date = new Date(text);
        return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
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

app.filter('timeFromNow', [function() {
    function timeFromNowFilter(time) {
        var diff = new Date() - time;
        if (diff < 1000 * 10) { // < 10 sec
            return 'just now';
        }

        if (diff < 1000 * 60) { // < 1 min
            return parseInt(diff / 1000) + ' sec ago';
        }

        if (diff < 1000 * 60 * 60) { // < 1 hour
            return parseInt(diff / (1000 * 60)) + ' min ago';
        }

        if (diff < 1000 * 60 * 60 * 24) { // < 1 day
            return parseInt(diff / (1000 * 60 * 60)) + ' hour(s) ago';
        }

        // >= 1 day
        return parseInt(diff / (1000 * 60 * 60 * 24)) + ' day(s) ago';
    };

    timeFromNowFilter.$stateful = true;
    return timeFromNowFilter;
}]);