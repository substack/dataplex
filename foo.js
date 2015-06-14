var dataplex = require('./index.js');
var Readable = require('stream').Readable;

var plex1 = dataplex();

plex1.add('/abc', function (params) {
    console.log('asdf');
    var s = new Readable();
    s._read = function () {};
    s.push('STREAM #');
    s.push(null);
    return s;
});

var plex2 = dataplex();
var p2 = plex2.open('/abc');

p2.on('data', function(data){
    console.log(data);
});

plex1.pipe(plex2).pipe(plex1);
