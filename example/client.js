var dataplex = require('../');
var net = require('net');

var plex = dataplex();
plex.open('/xyz').pipe(process.stdout);

var con = net.connect(5000);
con.pipe(plex).pipe(con);
