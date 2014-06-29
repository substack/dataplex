var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('cb', function (t) {
    t.plan(6);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/aaa/:n?', function (opts, cb) {
        cb(null, Array(Number(opts.n)+1).join('A'));
    });
    
    plex1.add('/bbb/:n?', function (opts) {
        var r = new Readable;
        r._read = function () {};
        r.push(Array(Number(opts.n)+1).join('B'));
        r.push(null);
        return r;
    });
    
    plex2.open('/aaa/5').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'AAAAA');
    }));
    plex1.get('/aaa/3').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'AAA');
    }));
    
    plex2.open('/aaa/5', function (err, body) {
        t.equal(body.toString('utf8'), 'AAAAA');
    });
    plex1.get('/aaa/3', function (err, body) {
        t.equal(body.toString('utf8'), 'AAA');
    });
    
    plex1.get('/bbb/5', function (err, body) {
        t.equal(body.toString('utf8'), 'BBBBB');
    });
    
    plex2.open('/bbb/5', function (err, body) {
        t.equal(body.toString('utf8'), 'BBBBB');
    });
    
    plex1.pipe(plex2).pipe(plex1);
});
