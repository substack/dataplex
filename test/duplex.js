var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');
var through = require('through2');
var split = require('split');
var combine = require('stream-combiner');

test('duplex', function (t) {
    t.plan(2);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/upper', function (opts) {
        return through(function (buf, enc, next) {
            this.push(buf.toString('utf8').toUpperCase());
            next();
        });
    });
    plex2.add('/reverse', function (opts) {
        return combine(split(), through(function (buf, enc, next) {
            var s = buf.toString('utf8').split('').reverse().join('');
            this.push(s + '\n');
            next();
        }));
    });
    
    var upper = plex2.get('/upper');
    upper.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'BEEP BOOP');
    }));
    upper.end('beep boop');
    
    var reverse = plex1.get('/reverse');
    reverse.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'eno\nowt\neerht\n');
    }));
    reverse.write('one\n');
    reverse.end('two\nthree');
    
    plex1.pipe(plex2).pipe(plex1);
});
