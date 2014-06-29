var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;
var split = require('split');
var through = require('through2');
var multiplex = require('multiplex');
var duplexer = require('duplexer2');
var concat = require('concat-stream');
var nextTick = require('process').nextTick;

var router = require('routes');
var xtend = require('xtend');

module.exports = Plex;
inherits(Plex, Duplex);

var codes = { create: 0 };

function Plex (opts) {
    var self = this;
    if (!(this instanceof Plex)) return new Plex(opts);
    if (!opts) opts = {};
    Duplex.call(this);
    
    this._mdm = multiplex();
    this.router = opts.router || router();
    this._indexes = {};
    
    var input = split();
    input.pipe(through(function (buf, enc, next) {
        var line = buf.toString('utf8');
        try { var row = JSON.parse(line) }
        catch (err) { return next() }
        if (!row || typeof row !== 'object') return next();
        self._handleCommand(row);
        next();
    }));
    
    var output = through.obj();
    this._sendCommand = function (row) {
        output.write(JSON.stringify(row) + '\n');
    };
    
    var rpc = this._mdm.createStream(0);
    output.pipe(rpc).pipe(input);
}

Plex.prototype._handleCommand = function (row) {
    var self = this;
    
    if (row[0] === codes.create) {
        var index = row[1];
        var pathname = row[2];
        var params = row[3];
        
        var stream = this.get(pathname, params);
        
        this._indexes[index] = true;
        var rstream = this._mdm.createStream(index);
        var wstream = this._mdm.createStream(index+1);
        
        var onend = function () { delete self._indexes[index] };
        rstream.once('end', onend);
        rstream.once('error', onend);
        
        if (stream.readable) stream.pipe(wstream);
        if (stream.writable) rstream.pipe(stream);
    }
};

Plex.prototype._read = function () {
    var self = this;
    var buf, reads = 0;
    while ((buf = this._mdm.read()) !== null) {
        if (buf.length === 0) continue;
        this.push(buf);
        reads ++;
    }
    if (reads === 0) this._mdm.once('readable', onread);
    function onread () { self._read() }
};

Plex.prototype._write = function (buf, enc, next) {
    this._mdm.write(buf);
    next();
};

Plex.prototype.add = function (r, fn) {
    this.router.addRoute(r, fn);
};

Plex.prototype.open = function (pathname, params, cb) {
    if (typeof params === 'function') {
        cb = params;
        params = {};
    }
    var index = this._allocIndex(0, 3);
    this._sendCommand([ codes.create, index, pathname, params ]);
    var stream = duplexer(
        this._mdm.createStream(index),
        this._mdm.createStream(index+1)
    );
    if (cb) {
        stream.once('error', cb);
        stream.pipe(concat(function (body) { cb(null, body) }));
    }
    return stream;
};

Plex.prototype._allocIndex = function (times, size) {
    if (times > 2) return this._allocIndex(0, size * 2);
    
    var buf = Buffer(size);
    for (var i = 0; i < buf.length; i++) {
        if (i === size - 1) {
            buf[i] = Math.floor(Math.random() * 128) * 2;
        }
        else {
            buf[i] = Math.floor(Math.random() * 256);
        }
    }
    var s = buf.toString('base64');
    if (has(this._indexes, s)) return this._allocIndex((times || 0) + 1);
    this._indexes[s] = true;
    return s;
};

Plex.prototype.get = function (pathname, params, cb) {
    if (typeof params === 'function') {
        cb = params;
        params = {};
    }
    var m = this.router.match(pathname);
    if (!m) return undefined;
    
    var stream = m.fn(xtend(m.params, params), function (err, res) {
        if (err) return; // TODO
        nextTick(function () {
            stream.end(res);
        });
    });
    if (!stream) stream = through();
    if (cb) {
        stream.once('error', cb);
        stream.pipe(concat(function (body) { cb(null, body) }));
    }
    return stream;
};

function has (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key) ;
}
