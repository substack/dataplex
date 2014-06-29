var dataplex = require('../../');
var net = require('net');

var con = net.connect(5000);
var plex = dataplex({ encoding: 'json' });
con.pipe(plex).pipe(con);

var stream = plex.open('/upper');
stream.pipe(process.stdout);
stream.end('beep boop\n');

plex.open('/book/snow-crash').pipe(process.stdout);
plex.open('/books').pipe(process.stdout);
