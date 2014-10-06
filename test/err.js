var dataplex = require('../');
var Readable = require('readable-stream').Readable;
var test = require('tape');
var concat = require('concat-stream');

test('remote stream error', function (t) {
    t.plan(1);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/xyz', function (opts) {
        var s = new Readable;
        s._read = function () {};
        process.nextTick(function () {
            s.emit('error', new Error('yo'));
        });
        return s;
    });
    
    var stream = plex2.open('/xyz');
    stream.on('error', function (err) {
        t.equal(err.message, 'yo');
    });
    
    plex1.pipe(plex2).pipe(plex1);
});

test('remote stream error cb', function (t) {
    t.plan(1);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/xyz', function (opts) {
        var s = new Readable;
        s._read = function () {};
        process.nextTick(function () {
            s.emit('error', new Error('yo'));
        });
        return s;
    });
    
    plex2.open('/xyz', function (err, body) {
        t.equal(err.message, 'yo');
    });
    
    plex1.pipe(plex2).pipe(plex1);
});

test('stream errback', function (t) {
    t.plan(1);
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/xyz', function (opts, cb) {
        process.nextTick(function () {
            cb(new Error('yo'));
        });
    });
    
    plex2.open('/xyz', function (err, body) {
        t.equal(err.message, 'yo');
    });
    
    plex1.pipe(plex2).pipe(plex1);
});

test('stream non-error instance errors', function (t) {
    t.plan(3);
    var prop = Object.getOwnPropertyNames;
    Object.getOwnPropertyNames = undefined;
    t.on('end', function () {
        Object.getOwnPropertyNames = prop;
    });
    
    var plex1 = dataplex();
    var plex2 = dataplex();
    
    plex1.add('/x1', function (opts, cb) {
        process.nextTick(function () {
            cb({ hey: 'yo' });
        });
    });
    
    plex1.add('/x2', function (opts, cb) {
        process.nextTick(function () {
            cb('hey');
        });
    });
    
    plex1.add('/x3', function (opts) {
        var s = new Readable;
        s._read = function () {};
        process.nextTick(function () {
            s.emit('error', new Error('yo'));
        });
        s.push('hyo');
        s.push(null);
        return s;
    });
    
    plex2.open('/x1', function (err, body) {
        t.deepEqual(err, { hey: 'yo' });
    });
    
    plex2.open('/x2', function (err, body) {
        t.equal(err, 'hey');
    });
    
    var s3 = plex2.open('/x3');
    s3.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), 'hyo');
    }));
    plex1.pipe(plex2).pipe(plex1);
});
