var dataplex = require('../');
var test = require('tape');
var concat = require('concat-stream');

test('cb', function (t) {
    t.plan(4);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/aaa/:n?', function (opts, cb) {
        cb(null, Array(Number(opts.n)+1).join('A'));
    });
    
    plex2.open('/aaa/5').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'AAAAA');
    }));
    plex1.get('/aaa/5').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'XYZ');
    }));
    
    plex2.open('/aaa/5', function (err, body) {
        t.equal(body.toString('utf8'), 'AAAAA');
    });
    plex1.get('/aaa/5', function (err, body) {
        t.equal(body.toString('utf8'), 'XYZ');
    });
    
    plex1.pipe(plex2).pipe(plex1);
});
