var dataplex = require('../../');
var net = require('net');
var Readable = require('readable-stream').Readable;

var server = net.createServer(function (stream) {
    var plex = dataplex();
    plex.add('/xyz', function (s) {
        var s = new Readable;
        s._read = function () {};
        var iv = setInterval(function () {
            s.push('yo\n');
        }, 100);
        s.once('_close', function () {
            console.log('close!');
            clearInterval(iv);
        });
        return s;
    });
    stream.pipe(plex).pipe(stream);
});
server.listen(5002);
