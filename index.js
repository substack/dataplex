var multiplex = require('multiplex');
var router = require('routes');
var xtend = require('xtend');
var Duplex = require('stream').Duplex;
var inherits = require('inherits');
var concat = require('concat-stream');

module.exports = Plex;
inherits(Plex, Duplex);
function Plex () {
    var self = this;
    if (!(this instanceof Plex)) return new Plex();
    Duplex.call(this);
    this.router = router();
    this.multiplex = multiplex({chunked: false}, function (stream, id) {
        var index = id.lastIndexOf('?');
        var pathname = id.substring(0,index);
        var params = JSON.parse(decodeURIComponent(id.substring(index+1)));
        var m = self.router.match(pathname);
        if (m) {
            var s = m.fn(xtend(m.params, params), function (err, data) {
                if (err) {
                    process.nextTick(function () {
                        stream.destroy(err);
                    });
                } else {
                    process.nextTick(function () {
                        stream.end(data);
                    });
                }
            });
            if (s) {
                if (s.readable) s.pipe(stream);
                if (s.writable) stream.pipe(s);
                
                stream.once('error', function (err) {
                    if (err.message==='Channel destroyed') {
                        if (s.destroy) s.destroy();
                    } else {
                        s.emit('error', err);
                    }
                });

                stream.on('close', function () {
                    s.emit('close');
                });
                stream.on('end', function () {
                    // console.log('END');
                    // s.emit('end');
                });

                s.on('end', function () {
                    // console.log('got end');
                    // stream.end();
                });

                s.on('close', function () {
                    
                });
                s.once('error', function () {
                    // stream.destroy();
                    s.emit('close');
                });

                s.on('data', function (data) {
                    // console.log('server - data');
                    // console.log(data.toString());
                });




            }
        } else {
            stream.destroy(new Error('Path not found! ' + pathname));
        }
    });

    (function () {
        var errored = false, ended = false;
        self.multiplex.on('error', function () {
            if (!errored && !ended) self.emit('end');
            errored = true;
        });
        self.multiplex.on('end', function () { ended = true ;});
    })();
}

Plex.prototype.add = function (r, fn) {
    this.router.addRoute(r, fn);
};

Plex.prototype.open = function (pathname, params, cb) {
    if (!params) params = {};
    if (typeof params === 'function') {
        cb = params;
        params = {};
    }
    if (typeof params !== 'object' && !Array.isArray(params)) throw new Error('Invalid params arg. Must be object (not an array).');    
    if (params) params = encodeURIComponent(JSON.stringify(params));
    var fullquery = pathname + '?' + params;
    var stream = this.multiplex.createStream(fullquery);
    if (cb) {
        stream.once('error', function(err) {
            cb(err);
        });
        stream.pipe(concat(function (body) {
            cb(null, body);
        }));
    } else {
        return stream;
    }
};

Plex.prototype._read = function () {
    var self = this;
    var buf, reads = 0;
    while ((buf = this.multiplex.read()) !== null) {
        if (buf.length === 0) continue;
        this.push(buf);
        reads ++;
    }
    if (reads === 0) this.multiplex.once('readable', onread);
    function onread () { self._read(); } // TODO MOVE TO CONSTRCUCTOR
};

Plex.prototype._write = function (chunk, enc, cb) {
    this.multiplex.write(chunk);
    cb();
};
