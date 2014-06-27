var net = require('net');
var dataplex = require('../');

var server = net.createServer(function (stream) {
    var plex = dataplex();
    plex.add('/xyz', function (opts) {
        return fs.createReadStream(__dirname + '/xyz.txt', opts);
    });
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
