var dataplex = require('../../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

var net = require('net');

test('long string', function (t) {
    t.plan(1);
    var payload = Array(500+1).join('A');
    
    var server = net.createServer(function (stream) {
        var plex = dataplex();
        plex.add('/long', function (opts) {
            var s = new Readable;
            s._read = function () {};
            s.push(payload);
            s.push(null);
            return s;
        });
        plex.pipe(stream).pipe(plex);
        t.once('end', function () { stream.end() });
    });
    server.listen(0, function () {
        var stream = net.connect(server.address().port);
        
        var plex = dataplex();
        plex.open('/long').pipe(concat(function (body) {
            t.equal(body.toString('utf8'), payload);
        }));
        plex.pipe(stream).pipe(plex);
    });
    t.on('end', function () { server.close() });
});
