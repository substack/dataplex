var net = require('net');
var dataplex = require('../../');
var through = require('through2');

var server = net.createServer(function (stream) {
    var plex = dataplex();
    plex.add('/upper', function (opts) {
        return through(function (buf, enc, next) {
            this.push(buf.toString('utf8').toUpperCase());
            next();
        });
    });
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
