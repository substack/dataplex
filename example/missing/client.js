var dataplex = require('../../');
var net = require('net');
var con = net.connect(5002);

var plex = dataplex();
con.pipe(plex).pipe(con);

var s = plex.open('/doesnotexist')
s.on('error', function (err) {
    console.log('err=', err);
});
s.pipe(process.stdout);
