var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;

module.exports = Session;
inherits(Session, Duplex);

function Session (opts) {
    if (!(this instanceof Session)) return new Session(opts);
}

Session.prototype._read = function () {
    // ...
};

Session.prototype._write = function (row, enc, next) {
    // ...
};
