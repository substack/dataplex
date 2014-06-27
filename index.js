var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var qs = require('querystring');
var router = require('routes');
var Duplex = require('readable-stream').Duplex;
var defined = require('defined');
var xtend = require('xtend');
var split = require('split');
var through = require('through2');
var combiner = require('stream-splicer');

var multiplex = require('multiplex');
var muxdemux = require('mux-demux');
var isarray = require('isarray');

module.exports = Plex;
inherits(Plex, Duplex);

var codes = { create: 0 };

function Plex (opts) {
    var self = this;
    if (!(this instanceof Plex)) return new Plex(opts);
    if (!opts) opts = {};
    Duplex.call(this);
    
    this._mdm = wrap((opts.multiplexer || muxdemux)(function (stream, key) {
        if (!stream) return;
        var id = defined(key, stream.meta, stream.id);
        if (id !== undefined) self._onstream(stream, id);
    }));
    
    this._streamIndex = 1;
    this._waiting = {
        0: function (stream) {
            stream.pipe(self._rpcInput);
            self._rpcOutput.pipe(stream);
            delete self._waiting[0];
        }
    };
    
    this._rpcInput = combiner(split(), through(function (buf, enc, next) {
        var line = buf.toString('utf8');
console.error('line=', line); 
        try { var row = JSON.parse(line) }
        catch (err) { return next() }
        if (!isarray(row)) return next();
console.error(row); 
        
        if (row[0] === codes.create) {
            var index = row[1];
            var pathname = row[2];
            var params = row[3];
            
            var m = self._router.match(pathname);
            if (!m) return;
            
            var stream = m.fn(xtend(m.params, params));
            var rstream = self._mdm.createStream(index);
            
            if (stream.readable) stream.pipe(rstream);
            if (stream.writable) rstream.pipe(stream);
        }
        next();
    }));
    this._rpcOutput = through.obj(function (row, enc, next) {
        this.push(JSON.stringify(row) + '\n');
        next();
    });
    
    this._mdm.createStream(0);
    this._router = router();
}

Plex.prototype._onstream = function (stream, id) {
    if (!has(this._waiting, id)) return;
    var w = this._waiting[id];
    delete this._waiting[id];
    w(stream);
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
    this._mdm.write(buf);
    next();
};

Plex.prototype.add = function (r, fn) {
    this._router.addRoute(r, fn);
};

Plex.prototype.open = function (pathname, params) {
    var self = this;
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
    self._rpcOutput.write([ codes.create, index, pathname, params ]);
    
    return stream;
};

Plex.prototype.get = function (pathname, params) {
    // ...
};

function has (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key) ;
}

function wrap (stream) {
    if (stream.read) return stream;
    var s = Duplex().wrap(stream);
    s._write = function (buf, enc, next) {
        stream.write(buf);
        next();
    };
    s.end = function (m) { stream.end(m) };
    return s;
}
