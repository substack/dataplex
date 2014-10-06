var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('error not an error', function (t) {
    t.plan(1);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/xyz', function (opts) {
        var s = new Readable;
        s._read = function () {};
        process.nextTick(function () {
            s.emit('error', { yo: 'YO' });
        });
        return s;
    });
    
    var stream = plex2.open('/xyz');
    stream.on('error', function (err) {
        t.deepEqual(err, { yo: 'YO' });
    });
    
    plex1.pipe(plex2).pipe(plex1);
});
