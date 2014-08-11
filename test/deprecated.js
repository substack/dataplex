var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('deprecated methods', function (t) {
    t.plan(1);
    
    var plex = dataplex();
    
    plex.add('/xyz', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push('XYZ');
        s.push(null);
        return s;
    });
    
    plex.get('/xyz').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'XYZ');
    }));
});
