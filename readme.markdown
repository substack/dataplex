# dataplex

binary stream multiplex router

[![testling badge](https://ci.testling.com/substack/dataplex.png)](https://ci.testling.com/substack/dataplex)

[![build status](https://secure.travis-ci.org/substack/dataplex.png)](http://travis-ci.org/substack/dataplex)

Use this module to organize a collection of streaming interfaces multiplexed
over a single bidirectional stream such as a web socket or a tcp connection.

![dataplex](images/dataplex.png)

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

The `opts.maxDepth` you specify will be passed directly through to
[multiplex](https://npmjs.org/package/multiplex). You might need to adjust this
value if you generate many hundreds of events simultaneously on different
streams.

You can give an `opts.missing` function as a catch-all fallback route.
`opts.missing(pathname)` is called with the route pathname string and should
return a stream like any other route. If the missing stream emits errors, these
errors are serialized like any other stream error.

Note that `plex` emits and consumes binary data, so whatever connection you pipe
data through must be binary-capable. This can sometimes be a problem in the
browser with string-encoded transports, but you use base64 to avoid issues with
binary-incapable transports.
See also: [shoe-bin](https://npmjs.org/package/shoe-bin).

## plex.add(pattern, fn)

Define a route on the underlying router instance.

`pattern` may contain parameters according to the syntax used by the
[routes](https://npmjs.org/package/routes) module. These parameters and other
parameters supplied to `open()`, `remote()`, or `local()` will be available to
the `fn(opts, cb)` function as the `opts`.

`fn(opts, cb)` will be called when the route is opened.
`fn` should return a stream (readable, writable, or duplex) or it may call
`cb(err, result)`, with a single `result` to send on the outgoing stream.

If the stream returned by `fn` emits an error, that error object will be
serialized and sent to the consumer of that pathname on the `'error'` event.

If `cb(err)` is called with an error, the error is serialized and sent on the
remote stream's `'error'` event.

When the remote stream closes, when an error occurs, or when the remote calls
`stream.destroy()`, a `'_close'` event fires on the stream object returned by
`fn`. `stream.destroy()` generates a `'_destroy'` event in addition to the
`'_close'` event.

## var stream = plex.open(pathname, params={}, cb)

Return a duplex stream from the remote or local endpoint matching `pathname`.

Local pathnames take precedence over remote names in the case where both sides
have defined a route at `pathname`.

See the `.local()` and `.remote()` methods for more info.

## var stream = plex.remote(pathname, params={}, cb)

Return a duplex stream from the remote or local endpoint matching `pathname`.

You can encode parameters directly into the `pathname` or pass them explicitly
with `params`. `params` takes precedence.

Optionally, you can pass in a `cb(err, body)` to buffer the stream output into a
single buffer.

If the remote stream emits an error, the error object is serialized and sent
through the `'error'` event or `cb(err)`.

`stream.destroy()` emits a `'_destroy'` event on the remote end in addition to a
`'_close'` event.

## var stream = plex.local(pathname, params={}, cb)

Return a duplex stream from the locally-defined routes matching `pathname`. You
can encode parameters directly into the `pathname` or pass them explicitly with
`params`. `params` takes precedence.

Optionally, you can pass in a `cb(err, body)` to buffer the stream output into a
single buffer.

## var stream = plex.get(pathname, params={}, cb)

Deprecated alias for `plex.local()`.

# events

Streams created with `plex.add()` will get these events in addition to the usual
stream events:

* `'_destroy'` - emitted when the remote end calls `stream.destroy()`
* `'_close'` - emitted when a stream errors, ends, or is destroyed

# install

With [npm](https://npmjs.org) do:

```
npm install dataplex
```

# license

MIT
