var dataplex = require('../../');
var net = require('net');
var con = net.connect(5002);

var plex = dataplex();
plex.open('/xyz').pipe(process.stdout);
plex.open('/abc').pipe(process.stdout);
con.pipe(plex).pipe(con);
