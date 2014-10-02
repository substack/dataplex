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

var codes = { create: 0, error: 1, destroy: 2 };

function Plex (opts) {
    var self = this;
    if (!(this instanceof Plex)) return new Plex(opts);
    if (!opts) opts = {};
    Duplex.call(this);
    
    this._mdm = multiplex({ maxDepth: opts.maxDepth });
    if (opts.missing) this._missing = opts.missing;
    
    (function () {
        var errored = false, ended = false;
        self._mdm.on('error', function () {
            if (!errored && !ended) self.emit('end');
            errored = true;
        });
        self._mdm.on('end', function () { ended = true });
    })();
    this.router = opts.router || router();
    this._indexes = {};
    this._remoteStreams = {};
    this._localStreams = {};
    this._allocSize = opts.allocSize || 3;
    this._eventNames = {
        close: '_close',
        destroy: '_destroy'
    };
    
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
        
        var stream = this.local(pathname, params);
        this._localStreams[index] = stream;
        var onerror = function (err) {
            self._sendCommand([ codes.error, index, serializeError(err) ]);
            var s = self._localStreams[index];
            if (s) {
                s.emit(self._eventNames.close);
                delete self._localStreams[index];
            }
        };
        
        if (!stream && self._missing) {
            stream = self._missing(pathname);
        }
        if (!stream) {
            stream = through();
            stream.push(null);
        }
        
        stream.on('error', onerror);
        
        this._indexes[index] = true;
        var rstream = this._mdm.createStream(index);
        var wstream = this._mdm.createStream(index+1);
        
        var onend = function () {
            delete self._indexes[index];
            delete self._localStreams[index];
            stream.removeListener('error', onerror);
        };
        rstream.once('end', onend);
        rstream.once('error', onend);
        
        if (stream.readable) stream.pipe(wstream);
        if (stream.writable) rstream.pipe(stream);
    }
    else if (row[0] === codes.error) {
        var index = row[1];
        var err = row[2];
        if (has(this._remoteStreams, index)) {
            this._remoteStreams[index].emit('error', err);
        }
    }
    else if (row[0] === codes.destroy) {
        var index = row[1];
        if (has(this._localStreams, index)) {
            var s = this._localStreams[index];
            s.emit(this._eventNames.destroy);
            s.emit(this._eventNames.close);
            if (s.destroy) {
                s.destroy();
            }
            else {
                s._read = function () {};
                s._write = function () {};
            }
            delete this._localStreams[index];
        }
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

Plex.prototype.remote = function (pathname, params, cb) {
    var self = this;
    if (typeof params === 'function') {
        cb = params;
        params = {};
    }
    var index = this._allocIndex(0, this._allocSize);
    this._sendCommand([ codes.create, index, pathname, params ]);
    var stream = duplexer(
        this._mdm.createStream(index),
        this._mdm.createStream(index+1)
    );
    this._remoteStreams[index] = stream;
    var ended = false;
    var onend = function () {
        if (ended) return;
        delete self._remoteStreams[index];
        ended = true;
    };
    stream.once('end', onend);
    stream.once('error', onend);
    
    stream.destroy = function () {
        delete self._remoteStreams[index];
        self._sendCommand([ codes.destroy, index ]);
    };
    
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
    if (has(this._indexes, s)) return this._allocIndex((times || 0) + 1, size);
    this._indexes[s] = true;
    return s;
};

Plex.prototype.local = function (pathname, params, cb) {
    var self = this;
    if (typeof params === 'function') {
        cb = params;
        params = {};
    }
    var m = this.router.match(pathname);
    if (!m) return undefined;
    
    var stream = m.fn(xtend(m.params, params), function (err, res) {
        nextTick(function () {
            if (err) stream.emit('error', err)
            else stream.end(res)
        });
    });
    if (!stream) stream = through();
    stream.once('finish', function () {
        stream.emit(self._eventNames.close);
    });
    
    if (cb) {
        stream.once('error', cb);
        stream.pipe(concat(function (body) { cb(null, body) }));
    }
    return stream;
};

Plex.prototype.open = function (pathname, params, cb) {
    var stream = this.local(pathname, params, cb);
    if (!stream) return this.remote(pathname, params, cb);
    return stream;
};

Plex.prototype.get = function (pathname, params, cb) {
    // DEPRECATED
    return this.local(pathname, params, cb);
};

function has (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key) ;
}

function serializeError (err) {
    if (err && typeof err === 'object') {
        var names = (Object.getOwnPropertyNames || Object.keys)(err);
        var eobj = {
            message: err.message || JSON.stringify(err),
            type: err.type
        };
        for (var i = 0; i < names.length; i++) {
            eobj[names[i]] = err[names[i]];
        }
        return eobj;
    }
    else return err;
}
