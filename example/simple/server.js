var net = require('net');
var fs = require('fs');
var dataplex = require('../../');

var server = net.createServer(function (stream) {
    var plex = dataplex();
    plex.add('/xyz', function (opts) {
        return fs.createReadStream(__dirname + '/xyz.txt', opts);
    });
    plex.add('/abc', function (opts) {
        return fs.createReadStream(__dirname + '/server.js', opts);
    });
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
