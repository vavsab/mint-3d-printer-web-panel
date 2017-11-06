String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function putLeadingZeros(num, size) {
    var s = num + '';
    while (s.length < size) {
        s = '0' + s;
    }

    return s;
}