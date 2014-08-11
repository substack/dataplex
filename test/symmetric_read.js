var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('read, peer <-> peer', function (t) {
    t.plan(3);
    
    var plex1 = dataplex();
    plex1.add('/robot', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push('beep boop');
        s.push(null);
        return s;
    });
    
    var plex2 = dataplex();
    plex2.add('/xyz', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push('XYZ');
        s.push(null);
        return s;
    });
    plex2.add('/abc', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push('ABC');
        s.push(null);
        return s;
    });
    
    plex1.open('/abc').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'ABC');
    }));
    plex1.open('/xyz').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'XYZ');
    }));
    plex2.open('/robot').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'beep boop');
    }));
    
    plex1.pipe(plex2).pipe(plex1);
});
