# dataplex

binary stream multiplex router

Use this module to organize a collection of streaming interfaces multiplexed
over a single bidirectional stream such as a web socket or a tcp connection.

# example

``` js
```

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
