var dataplex = require('../');
var Writable = require('readable-stream').Writable;
var test = require('tape');
var concat = require('concat-stream');

test('close event on destroy', function (t) {
    t.plan(2);
    
    var events = [];
    var buffers = [];
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/xyz', function (opts) {
        var s = new Writable;
        s._write = function (buf, enc, next) {
            buffers.push(buf);
            next();
        };
        s.on('_destroy', function () {
            events.push('_destroy');
        });
        s.on('_close', function () {
            events.push('_close');
        });
        return s;
    });
    
    var stream = plex2.open('/xyz');
    stream.destroy();
    stream.end('yo');
    
    plex1.pipe(plex2).pipe(plex1);
    
    setTimeout(function () {
        t.deepEqual(buffers, []);
        t.deepEqual(events, [ '_destroy', '_close' ]);
    }, 20);
});
