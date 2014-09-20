var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var through = require('through2');

test('missing error', function (t) {
    t.plan(2);
    
    var plex1 = dataplex({
        missing: function (p) {
            t.equal(p, '/foo');
            var tr = through();
            process.nextTick(function () {
                tr.emit('error', new Error('yo'));
            });
            return tr;
        }
    });
    var plex2 = dataplex();
    
    var stream = plex2.open('/foo');
    stream.on('error', function (err) {
        t.equal(err.message, 'yo');
    });
    
    plex1.pipe(plex2).pipe(plex1);
});
