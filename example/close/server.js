var dataplex = require('../../');
var net = require('net');
var con = net.connect(5002);
var Readable = require('readable-stream').Readable;

var plex = dataplex();
plex.add('/xyz', function (s) {
    var s = new Readable;
    s._read = function () {};
    var iv = setInterval(function () {
        s.push('yo\n');
    });
    s.once('_close', function () {
        clearInterval(iv);
    });
    return s;
});
con.pipe(plex).pipe(con);
