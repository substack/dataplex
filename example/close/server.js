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
        }, 500);
        s.once('_close', function () {
            console.log('close!');
            clearInterval(iv);
        });
        return s;
    });
    stream.on('error', function () {});
    stream.pipe(plex).pipe(stream);
});
server.listen(5002);
