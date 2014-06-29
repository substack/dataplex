var dataplex = require('../../');
var net = require('net');

var con = net.connect(5000);
var plex = dataplex();
con.pipe(plex).pipe(con);

var stream = plex.open('/upper');
stream.pipe(process.stdout);
stream.end('beep boop');
