var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('long string', function (t) {
    t.plan(1);
    var payload = Buffer(Array(50000+1).join('A'));
    
    var plex1 = dataplex();
    plex1.add('/long', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push(payload);
        s.push(null);
        return s;
    });
    
    var plex2 = dataplex();
    plex2.open('/long').pipe(concat(function (body) {
        t.equal(body.length, payload.length);
    }));
    plex2.pipe(plex1).pipe(plex2);
});
