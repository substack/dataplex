var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('get a local stream', function (t) {
    t.plan(2);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/xyz', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push('XYZ');
        s.push(null);
        return s;
    });
    
    plex2.open('/xyz').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'XYZ');
    }));
    
    plex1.open('/xyz').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'XYZ');
    }));
    
    plex1.pipe(plex2).pipe(plex1);
});
