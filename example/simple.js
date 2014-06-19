var dataplex = require('../');
var fs = require('fs');
var net = require('net');

var plex = dataplex();

plex.add('file', { type: 'readable' }, function (opts) {
    return fs.createReadStream(__dirname + '/simple.txt');
});

var server = net.createServer(function (stream) {
    stream.pipe(plex.createStream()).pipe(stream);
});
server.listen(5000);
