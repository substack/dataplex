var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

var chunky = require('chunky');

test('long string', function (t) {
    t.plan(1);
    var payload = Buffer(Array(50000+1).join('A'));
    var chunks = chunky(payload);
    
    var plex1 = dataplex();
    plex1.add('/long', function (opts) {
        var s = new Readable;
        s._read = function () {};
        (function next () {
            if (chunks.length === 0) return s.push(null);
            s.push(chunks.shift());
            setTimeout(next, 10);
        })();
        return s;
    });
    
    var plex2 = dataplex();
    plex2.open('/long').pipe(concat(function (body) {
        t.equal(body.length, payload.length);
    }));
    plex2.pipe(plex1).pipe(plex2);
});
