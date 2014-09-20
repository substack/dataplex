var net = require('net');
var fs = require('fs');
var through = require('through2');
var dataplex = require('../../');

var server = net.createServer(function (stream) {
    var plex = dataplex({
        missing: function (p) {
            var tr = through();
            process.nextTick(function () {
                tr.emit('error', new Error('not found!'));
            });
            return tr;
        }
    });
    plex.add('/xyz', function (opts) {
        return fs.createReadStream(__dirname + '/xyz.txt', opts);
    });
    stream.pipe(plex).pipe(stream);
});
server.listen(5002);
