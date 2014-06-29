var net = require('net');
var dataplex = require('../../');
var through = require('through2');
var db = require('level')('books.db');
db.batch(require('./data.json'));

var server = net.createServer(function (stream) {
    var plex = dataplex();
    plex.add('/upper', function (opts) {
        return through(function (buf, enc, next) {
            this.push(buf.toString('utf8').toUpperCase());
            next();
        });
    });
    
    plex.add('/books', function (opts) {
        return db.createReadStream({ lt: 'book!\uffff', gt: 'book!' });
    });
    
    plex.add('/book/:name', function (opts, cb) {
        db.get('book!' + opts.name, cb);
    });
    
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
