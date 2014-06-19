var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var Session = require('./lib/session.js');

module.exports = Plex;
inherits(Plex, EventEmitter);

function Plex (opts) {
    if (!(this instanceof Plex)) return new Plex(opts);
    this._sources = {};
}

Plex.prototype.add = function (name, meta, fn) {
    this._sources[name] = { meta: meta, fn: fn };
};

Plex.prototype.createStream = function (opts) {
    if (!opts) opts = {};
    return new Session(this);
};
