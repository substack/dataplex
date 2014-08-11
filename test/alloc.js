var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('alloc test', function (t) {
    t.plan(300);
    
    var plex1 = dataplex({ allocSize: 1 });
    var plex2 = dataplex();
    
    for (var i = 0; i < 300; i++) (function (i) {
        plex1.add('/x' + i, function (opts) {
            var s = new Readable;
            s._read = function () {};
            s.push('STREAM #' + i);
            s.push(null);
            return s;
        });
    })(i);
    
    for (var i = 0; i < 300; i++) (function (i) {
        plex2.open('/x' + i).pipe(concat(function (body) {
            t.equal(body.toString('utf8'), 'STREAM #' + i);
        }));
    })(i);
    
    plex1.pipe(plex2).pipe(plex1);
});
