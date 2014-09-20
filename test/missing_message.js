var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');
var through = require('through2');

test('missing message', function (t) {
    t.plan(2);
    
    var plex1 = dataplex({
        missing: function (p) {
            t.equal(p, '/foo');
            var tr = through();
            tr.push('beep boop');
            tr.push(null);
            return tr;
        }
    });
    var plex2 = dataplex();
    
    var stream = plex2.open('/foo');
    stream.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'beep boop');
    }));
    
    plex1.pipe(plex2).pipe(plex1);
});
