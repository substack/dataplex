var net = require('net');
var fs = require('fs');
var dataplex = require('../../');
var Router = require('routes');

var router = Router();
router.addRoute('/xyz', function (opts) {
    return fs.createReadStream(__dirname + '/xyz.txt', opts);
});
router.addRoute('/abc', function (opts) {
    return fs.createReadStream(__dirname + '/server.js', opts);
});

var server = net.createServer(function (stream) {
    var plex = dataplex({ router: router });
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
