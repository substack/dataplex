var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('route parameters', function (t) {
    t.plan(4);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/upper/:msg?', function (opts) {
        var s = new Readable;
        s._read = function () {};
        s.push(opts.msg.toUpperCase());
        s.push(null);
        return s;
    });
    
    plex2.get('/upper', { msg: 'beep boop' }).pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'BEEP BOOP');
    }));
    
    plex2.get('/upper/amaze').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'AMAZE');
    }));
    
    plex1.get('/upper', { msg: 'beep boop' }).pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'BEEP BOOP');
    }));
    
    plex1.get('/upper/amaze').pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'AMAZE');
    }));
    
    plex1.pipe(plex2).pipe(plex1);
});
