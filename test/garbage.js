var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');

test('garbage in', function (t) {
    t.plan(1);
    
    var plex = dataplex();
    plex.add('/xyz', function (opts) {});
    
    plex.on('end', function () {
        t.ok(true, 'hung up');
    });
    plex.write('yoyoyo\n');
    plex.resume();
});

test('garbage already ended', function (t) {
    t.plan(1);
    
    var plex = dataplex();
    plex.add('/xyz', function (opts) {});
    
    plex.on('end', function () {
        t.ok(true, 'hung up');
    });
    plex.write('yoyoyo\n');
    plex._mdm.end();
    plex.resume();
});
