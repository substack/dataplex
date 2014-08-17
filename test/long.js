var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('long string', function (t) {
    t.plan(1);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    var payload = Array(500+1).join('A');
    
    plex2.add('/long', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push(payload);
        s.push(null);
        return s;
    });
    
    plex1.open('/abc').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), payload);
    }));
    
    plex1.pipe(plex2).pipe(plex1);
});
