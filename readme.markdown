# dataplex

binary stream multiplex router

Use this module to organize a collection of streaming interfaces multiplexed
over a single bidirectional stream such as a web socket or a tcp connection.

# example

We can build a tcp server to host up some book data and other assorted streams
at different endpoints:

``` js
var net = require('net');
var dataplex = require('dataplex');
var through = require('through2');
var db = require('level')('books.db', { encoding: 'json' });
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
        return db.createReadStream({ lt: 'book!\uffff', gt: 'book!' })
            .pipe(through.obj(function (row, enc, next) {
                this.push(row.key.split('!')[1] + '\n');
                next();
            }))
        ;
    });
    
    plex.add('/book/:name', function (opts, cb) {
        db.get('book!' + opts.name, function (err, row) {
            cb(err, JSON.stringify(row) + '\n');
        });
    });
    
    stream.pipe(plex).pipe(stream);
});
server.listen(5000);
```

and now we can build a client to open up multiple streams from the server, all
multiplexed over a single tcp connection:

```
var dataplex = require('dataplex');
var net = require('net');

var con = net.connect(5000);
var plex = dataplex();
con.pipe(plex).pipe(con);

var stream = plex.open('/upper');
stream.pipe(process.stdout);
stream.end('beep boop\n');

plex.open('/book/snow-crash').pipe(process.stdout);
plex.open('/books').pipe(process.stdout);
```

All the streams get dumped to stdout as expected:

```
$ node server.js &
[1] 12025
$ node client.js
BEEP BOOP
{"author":"Neil Stephenson","year":1993}
cryptonomicon
diamond-age
snow-crash
^C
```

This example showed a client and server, but the protocol is fully symmetric so
either side can define and consume streams from the other end.

# methods

``` js
var dataplex = require('dataplex')
```

## var plex = dataplex(opts)

You can optionally pass in an `opts.router` to use. The API of `opts.router`
should match the [routes](https://npmjs.org/package/routes) module.

Passing in a custom `opts.route` is useful if you want to define your routes
outside of a connection callback more similarly to how http routers are
typically used. Consult the `example/router` directory for an example.

## plex.add(pattern, fn)

Define a route on the underlying router instance.

`pattern` may contain parameters according to the syntax used by the
[routes](https://npmjs.org/package/routes) module. These parameters and other
parameters supplied to `open()` or `get()` will be available to the
`fn(opts, cb)` function as the `opts`.

`fn(opts, cb)` will be called when the route is opened.
`fn` should return a stream (readable, writable, or duplex) or it may call
`cb(err, result)`, with a single `result` to send on the outgoing stream.

## var stream = plex.open(pathname, params={}, cb)

Return a duplex stream from the remote endpoint matching `pathname`. You can
encode parameters directly into the `pathname` or pass them explicitly with
`params`. `params` takes precedence.

Optionally, you can pass in a `cb(err, body)` to buffer the stream output into a
single buffer.

## var stream = plex.get(pathname, params={}, cb)

Return a duplex stream from the locally-defined routes matching `pathname`. You
can encode parameters directly into the `pathname` or pass them explicitly with
`params`. `params` takes precedence.

Optionally, you can pass in a `cb(err, body)` to buffer the stream output into a
single buffer.

# install

With [npm](https://npmjs.org) do:

```
npm install dataplex
```

# license

MIT
