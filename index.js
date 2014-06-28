var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var qs = require('querystring');
var router = require('routes');
var Duplex = require('readable-stream').Duplex;
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
    
    this._mdm = wrap((opts.multiplexer || multiplex)(function (stream, key) {
console.error('STREAM!', stream, key); 
    }));
    
    this._streamIndex = 0;
    
    this._rpcInput = combiner(split(), through(function (buf, enc, next) {
        var line = buf.toString('utf8');
console.error('line=', line); 
        try { var row = JSON.parse(line) }
        catch (err) { return next() }
        if (!isarray(row)) return next();
        
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
    
    var rpc = this._mdm.createStream(this._streamIndex ++);
    self._rpcInput.pipe(rpc).pipe(self._rpcOutput);
    
    this._router = router();
}

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
    var index = this._streamIndex ++;
    this._rpcOutput.write([ codes.create, index, pathname, params ]);
    return this._mdm.createStream(index);
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
