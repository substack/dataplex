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
        process.nextTick(function () {
            s.emit('error', new Error('yo'));
        });
        s.on('error', function (err) {
            events.push('error:' + err.message);
        });
        s.on('close', function () {
            events.push('close');
        });
        return s;
    });
    
    var stream = plex2.open('/xyz');
    stream.end('yosomething'); // change test 
    
    plex1.pipe(plex2).pipe(plex1);
    
    setTimeout(function () {
        t.deepEqual(buffers, []);
        t.deepEqual(events, [ 'error:yo', 'close' ]);
    }, 20);
});
