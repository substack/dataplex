var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');
var test = require('tape');

test('garbage in', function (t) {
    t.plan(1);
    
    var plex = dataplex();
    plex.add('/xyz', function (opts) {});
    
    plex.on('end', function () {
        t.ok(true, 'hung up');
    });
    plex.write(Array(5000).join('yoyoyo\n'));
    plex.resume();
});

test('garbage already ended', function (t) {
    t.plan(1);
    
    var plex = dataplex();
    plex.add('/xyz', function (opts) {});
    
    plex.on('end', function () {
        t.ok(true, 'hung up');
    });
    plex.write(Array(5000).join('yoyoyo\n'));
    plex._mdm.end();
    plex.resume();
});

test('ignore garbage rpc json', function (t) {
    t.plan(1);
    
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
    
    plex2._mdm.createStream(0).write('[[[[}\n'); // invalid json
    plex2._mdm.createStream(0).write('"boo"\n'); // wrong type of object
    
    plex1.pipe(plex2).pipe(plex1);
});
