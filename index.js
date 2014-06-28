var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var qs = require('querystring');

var Duplex = require('readable-stream').Duplex;
var split = require('split');
var through = require('through2');
var combiner = require('stream-combiner');
var duplexer = require('duplexer2');

var isarray = require('isarray');
var defined = require('defined');
var xtend = require('xtend');

var router = require('routes');

var multiplex = require('multiplex');

module.exports = Plex;
inherits(Plex, Duplex);

var codes = { prelude: 0, create: 1 };

function Plex (opts) {
    var self = this;
    if (!(this instanceof Plex)) return new Plex(opts);
    if (!opts) opts = {};
    Duplex.call(this);
    
    this._mdm = wrap((opts.multiplexer || multiplex)());
    
    this._router = router();
    this._streamIndex = 0;
    
    var rpc = this._mdm.createStream(this._streamIndex ++);
    rpc.pipe(this._createRpc()).pipe(rpc);
    
    this._ownId = Math.floor(Math.random() * Math.pow(2,32));
    this._sendCommand([ codes.prelude, this._ownId ]);
}

Plex.prototype._createRpc = function () {
    var self = this;
    var input = combiner(split(), through(function (buf, enc, next) {
        var line = buf.toString('utf8');
console.error('line=', line); 
        try { var row = JSON.parse(line) }
        catch (err) { return next() }
        if (!isarray(row)) return next();
        self._handleCommand(row);
        next();
    }));
    
    var output = through.obj();
    this._sendCommand = function (row) {
        output.push(JSON.stringify(row) + '\n');
    };
    
    return duplexer(input, output);
};
    
Plex.prototype._handleCommand = function (row) {
    if (row[0] === codes.prelude && this._otherId === undefined) {
        var cmp = this._ownId < row[1] ? 1
            : this._ownId > row[1] ? -1
            : 0
        ;
console.error('cmp=', cmp);
        if (cmp === 0) {
            this._ownId = Math.floor(Math.random() * Math.pow(2,32));
            this._sendCommand([ codes.prelude, this._ownId ]);
            return;
        }
        
        this._cmpId = cmp;
        this._otherId = row[1];
        this.emit('_prelude', this._ownId, this._otherId);
    }
    else if (row[0] === codes.create) {
        var index = row[1];
        var pathname = row[2];
        var params = row[3];
        
        var m = this._router.match(pathname);
        if (!m) return;
        
        var stream = m.fn(xtend(m.params, params));
        var rstream = this._mdm.createStream(index);
        
        if (stream.readable) stream.pipe(rstream);
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
    this._router.addRoute(r, fn);
};

Plex.prototype.open = function (pathname, params) {
    var index = this._streamIndex ++;
    this._sendCommand([ codes.create, index, pathname, params ]);
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
