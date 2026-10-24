/* S6 rail — frame sequences from _shared/scroll/manifest.json, drawn on <canvas> by scroll progress.
   Counts, sizes, folders and posters always come from the manifest (the frames will be replaced). */
(function () {
  'use strict';
  var BASE = '_shared/scroll/';
  var manifestP = null;
  function manifest() {
    if (!manifestP) manifestP = fetch(BASE + 'manifest.json').then(function (r) { return r.json(); });
    return manifestP;
  }

  // one shared queue: a handful of requests at a time, keyframes jump the line
  var queue = [], active = 0, MAX = 4;
  function pump() {
    while (active < MAX && queue.length) {
      var job = queue.shift();
      active++;
      job().then(done, done);
    }
  }
  function done() { active--; pump(); }
  function enqueue(job, urgent) { if (urgent) queue.unshift(job); else queue.push(job); pump(); }

  function Sequence(man, key, mobile) {
    var s = man.sequences[key];
    var m = mobile && s.mobile ? s.mobile : s;
    this.key = key;
    this.dir = BASE + m.dir + '/';
    this.count = m.count;
    this.width = m.width;
    this.height = m.height;
    this.poster = s.poster ? BASE + s.poster : '';
    this.pattern = man.pattern || 'f_{index:03d}.webp';
    this.base = man.index_base || 0;
    this.frames = new Array(this.count);
    this.queued = new Uint8Array(this.count);
    this.listeners = [];
    this.loaded = 0;
  }
  Sequence.prototype.url = function (i) {
    var n = i + this.base;
    return this.dir + this.pattern.replace(/\{index(?::0?(\d+)d)?\}/, function (_, w) {
      var s = String(n);
      while (w && s.length < +w) s = '0' + s;
      return s;
    });
  };
  Sequence.prototype.fetchFrame = function (i, urgent) {
    if (i < 0 || i >= this.count || this.queued[i]) return;
    this.queued[i] = 1;
    var self = this;
    enqueue(function () {
      return new Promise(function (resolve) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () {
          var ready = im.decode ? im.decode().catch(function () {}) : Promise.resolve();
          ready.then(function () {
            self.frames[i] = im; self.loaded++;
            self.listeners.forEach(function (fn) { fn(i); });
            resolve();
          });
        };
        im.onerror = function () { resolve(); };
        im.src = self.url(i);
      });
    }, urgent);
  };
  // keyframes first (every 8th + the last), then 4th, 2nd, and the rest
  Sequence.prototype.loadKeys = function () {
    for (var i = 0; i < this.count; i += 8) this.fetchFrame(i, false);
    this.fetchFrame(this.count - 1, false);
  };
  Sequence.prototype.loadAll = function () {
    this.loadKeys();
    var steps = [4, 2, 1];
    for (var k = 0; k < steps.length; k++)
      for (var i = 0; i < this.count; i += steps[k]) this.fetchFrame(i, false);
  };
  Sequence.prototype.nearest = function (i) {
    if (this.frames[i]) return i;
    for (var d = 1; d < this.count; d++) {
      if (this.frames[i - d]) return i - d;
      if (this.frames[i + d]) return i + d;
    }
    return -1;
  };

  function Painter(canvas, seq) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.seq = seq;
    this.want = 0;
    this.drawn = -1;
    var self = this;
    seq.listeners.push(function () { self.paint(); });
    this.resize();
  }
  Painter.prototype.resize = function () {
    var r = this.c.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (w !== this.c.width || h !== this.c.height) { this.c.width = w; this.c.height = h; this.drawn = -1; this.paint(); }
  };
  Painter.prototype.set = function (progress) {
    var p = Math.min(1, Math.max(0, progress || 0));
    this.want = Math.round(p * (this.seq.count - 1));
    this.paint();
  };
  // redraw only when the nearest loaded frame changes; cover-fit like object-fit: cover
  Painter.prototype.paint = function () {
    var k = this.seq.nearest(this.want);
    if (k < 0 || k === this.drawn) return;
    var im = this.seq.frames[k], cw = this.c.width, ch = this.c.height;
    if (cw < 2 || ch < 2) return;
    var iw = im.naturalWidth, ih = im.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), sw = cw / s, sh = ch / s;
    this.ctx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
    this.drawn = k;
    this.c.classList.add('on');
  };

  window.S6Scrub = { manifest: manifest, Sequence: Sequence, Painter: Painter };
})();
