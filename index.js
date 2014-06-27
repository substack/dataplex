var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var qs = require('querystring');
var router = require('routes');
var rpc = require('rpc-stream');
var Duplex = require('readable-stream').Duplex;
var defined = require('defined');
var xtend = require('xtend');

var multiplex = require('multiplex');
var muxdemux = require('mux-demux');

module.exports = Plex;
inherits(Plex, Duplex);

function Plex (opts) {
    var self = this;
    if (!(this instanceof Plex)) return new Plex(opts);
    if (!opts) opts = {};
    Duplex.call(this);
    
    this._mdm = wrap((opts.multiplexer || muxdemux)(function (stream, key) {
        if (!stream) return;
        var id = defined(key, stream.meta, stream.id);
console.error('id=', id);
        if (id !== undefined) self._onstream(stream, id);
    }));
    
    this._streamIndex = 1;
    this._waiting = {
        0: function (stream) {
            stream.pipe(self._rpc).pipe(stream);
            delete self._waiting[0];
        }
    };
    
    this._rpc = rpc({
        create: function (index, pathname, params, cb) {
console.error('create', index, pathname, params); 
            var m = self._router.match(pathname);
            if (!m) return cb(false)
            
            var stream = m.fn(xtend(m.params, params));
            var rstream = self._mdm.createStream(index);
            
            if (stream.readable) stream.pipe(rstream);
            if (stream.writable) rstream.pipe(stream);
            
            cb(true);
        }
    });
    this._rpcClient = this._rpc.wrap([ 'create' ]);
    this._mdm.createStream(0);
    
    this._router = router();
}

Plex.prototype._onstream = function (stream, id) {
    if (has(this._waiting, id)) {
        var w = this._waiting[id];
        delete this._waiting[id];
        w(stream);
    }
};

Plex.prototype._read = function () {
    var self = this;
    var buf, reads = 0;
    while ((buf = this._mdm.read()) !== null) {
        if (buf.length) {
            this.push(buf);
            reads ++;
        }
    }
    if (reads === 0) this._mdm.once('readable', onread);
    function onread () { self._read() }
};

Plex.prototype._write = function (buf, enc, next) {
    this._mdm._write(buf, enc, next);
};

Plex.prototype.add = function (r, fn) {
    this._router.addRoute(r, fn);
};

Plex.prototype.open = function (pathname, params) {
    var stream = new Duplex;
    stream._write = function (buf, enc, next) {
        stream._buf = buf;
        stream._enc = enc;
        stream._next = next;
    };
    stream._read = function () {
        stream._reading = true;
    };
    
    var index = this._streamIndex ++;
    this._waiting[index] = function (rep) {
        stream._write = function (buf, enc, next) {
            rep._write(buf, enc, next);
        };
        stream._read = function read () {
            var buf, reads = 0;
            while ((buf = rep.read()) !== null) {
                if (buf.length === 0) continue;
                stream.push(buf);
                reads ++;
            }
            if (reads === 0) rep.once('readable', read);
        };
        
        if (stream._buf) {
            var buf = stream._buf;
            var enc = stream._enc;
            var next = stream._next;
            stream._buf = undefined;
            stream._enc = undefined;
            stream._next = undefined;
            stream._write(buf, enc, next);
        }
        if (stream._reading) stream._read();
    };
    
    this._rpcClient.create(index, pathname, params);
    
    return stream;
};

Plex.prototype.get = function (pathname, params) {
    // ...
};

function has (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key) ;
}

function wrap (stream) {
    var s = Duplex().wrap(stream);
    s._write = function (buf, enc, next) {
        stream.write(buf);
        next();
    };
    s.end = function (m) { stream.end(m) };
    return s;
}
