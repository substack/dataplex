var net = require('net');
var dataplex = require('../../');
var through = require('through2');
var db = require('level')('books.db', { encoding: 'json' });
db.batch(require('./data.json'));

var server = net.createServer(function (stream) {
    var plex = dataplex({ valueEncoding: 'json' });
    plex.add('/upper', function (opts) {
        return through(function (buf, enc, next) {
            this.push(buf.toString('utf8').toUpperCase());
            next();
        });
    });
    
    plex.add('/books', function (opts) {
        return db.createReadStream({ lt: 'book!\uffff', gt: 'book!' })
            .pipe(through.obj(function (row, enc, next) {
                this.push(row.key.split('!')[1] + '\n');
                next();
            }))
        ;
    });
    
    plex.add('/book/:name', function (opts, cb) {
        db.get('book!' + opts.name, { encoding: 'utf8' }, function (err, row) {
            cb(err, row + '\n');
        });
    });
    
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
