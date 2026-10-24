/* S6 rail — landing page. Renders from window.CCEL, then wires the two scroll-linked canvases:
   the hero clip (scrubs while the hero scrolls away, not pinned) and the research rail
   (a sticky stage whose track of area panels is moved by a CSS transform from native vertical scroll). */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;
  var root = document.documentElement;
  var cur = D.curation || {};
  var areas = S.areas;
  var N = areas.length;

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var railMQ = window.matchMedia('(min-width: 960px) and (min-height: 600px)');

  /* ------------------------------------------------------------------ render */
  // v5 lean landing: identity, the research rail (visual + title + one keyword line per area), news,
  // open position, the six pinned papers as a compact list, the Korean introduction, contact.
  // No counts anywhere on this page; the full research text lives on research.html.
  function renderHero() {
    var lab = D.lab || {}, w = D.welcome || {};
    document.title = (lab.short || '') + ' — ' + (lab.name || '');
    $('#hero-aff').textContent = lab.affiliation || '';
    $('#hero-title').textContent = lab.name || '';
    $('#hero-identity').textContent = w.tagline || '';
  }

  function renderResearch() {
    $('#rail-index').innerHTML = areas.map(function (a, i) {
      return '<li><a href="#area-' + esc(a.numeral) + '" data-i="' + i + '" title="' + esc(a.title) + '"><span class="n">' + esc(a.numeral) +
        '</span><span class="l">' + esc(a.title) + '</span></a></li>';
    }).join('');
    $('#track').innerHTML = areas.map(function (a, i) {
      var n = esc(a.numeral), more = 'research.html#area-' + n;
      return '<article class="panel" id="area-' + n + '" data-i="' + i + '" aria-labelledby="area-' + n + '-t">' +
        '<figure class="plate p-fig"><img class="poster" alt="Illustration for research area ' + n + ': ' + esc(a.title) + '" decoding="async">' +
          '<canvas aria-hidden="true"></canvas></figure>' +
        '<div class="p-main">' +
          '<p class="p-label">Research area ' + n + '</p>' +
          '<h3 id="area-' + n + '-t"><a href="' + more + '">' + S.rich(a.title) + '</a></h3>' +
          '<p class="p-line">' + (a.keywords || []).map(esc).join(' · ') + '</p>' +
          '<a class="p-more" href="' + more + '">Summary and key papers</a>' +
        '</div></article>';
    }).join('');
  }

  function renderNewsOpening() {
    var w = D.welcome || {}, pr = D.professor || {};
    $('#news-list').innerHTML = (w.news || []).map(function (n) {
      return '<li>' + (n.date ? '<span class="small">' + esc(n.date) + '</span> ' : '') + S.rich(n.text) + '</li>';
    }).join('');
    $('#opening-ko').textContent = w.opening_ko || '';
    $('#join-contact').innerHTML = pr.email ? 'Contact ' + esc(pr.name) + ': <a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a>' : '';
  }

  // the professor's pins in order: title, one journal line, DOI (full citations are on publications.html#selected)
  function renderSelected() {
    $('#sel-list').innerHTML = (cur.selected_pins || []).map(function (pin) {
      var p = S.byNo[pin.no];
      if (!p) return '';
      var a = S.areaBy[pin.area], url = S.paperUrl(p);
      var t = S.rich(p.title);
      return '<li>' +
        (a ? '<p class="sc-area"><span class="n">' + esc(a.numeral) + '</span>' + esc(a.title) + '</p>' : '') +
        '<p class="sc-t">' + (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + t + '</a>' : t) + '</p>' +
        '<p class="sc-src">' + esc(S.sourceText(p)) + '</p>' +
        (p.doi ? '<a class="doi" href="https://doi.org/' + esc(p.doi) + '" target="_blank" rel="noopener">doi:' + esc(p.doi) + '</a>'
          : url ? '<a class="doi" href="' + esc(url) + '" target="_blank" rel="noopener">Article link</a>' : '') +
        '</li>';
    }).join('');
  }

  function renderAboutContact() {
    var w = D.welcome || {}, c = D.contact || {};
    $('#about-ko').textContent = w.about_ko || '';
    var rows = [['Address', c.address], ['Email', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : ''],
      ['Professor office', c.professor_office], ['Laboratory', c.laboratory], ['Student office', c.student_office]];
    $('#contact-dl').innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<dt>' + esc(r[0]) + '</dt><dd>' + (r[0] === 'Email' ? r[1] : esc(r[1])) + '</dd>';
    }).join('');
    $('#contact-name').textContent = c.lab_name || D.lab.name || '';
  }

  /* ------------------------------------------------------------------ scroll stage */
  var Scrub = window.S6Scrub;
  var hero = { el: null, painter: null, seq: null, top: 0, h: 0 };
  var rail = {
    on: false, el: null, stage: null, track: null, panels: [], links: [], bar: null,
    top: 0, dist: 1, hdr: 80, W: 0, keys: [], s: 0, active: -1,
    seqs: [], painters: [], near: false
  };
  var HOLD0 = 0.04, HOLD1 = 0.08; // short holds on panel I and panel V
  var STEP_VH = 60;               // vertical scroll per panel: rail = 100 + 4 x 60 = 340vh
  var motion = false, mobileFrames = false, man = null, scrolledOnce = false;
  var inView = new Set();   // list-mode cards near the viewport (frames start after the first scroll)

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return 0.35 * t + 0.65 * t * t * (3 - 2 * t); }
  function hdrC() { return parseFloat(getComputedStyle(root).getPropertyValue('--hdr-c')) || 80; }

  function sFromP(p) {
    var x = clamp((p - HOLD0) / (1 - HOLD0 - HOLD1)) * (N - 1);
    var i = Math.min(N - 2, Math.floor(x));
    return i + ease(x - i);
  }
  function pFromS(s) { return HOLD0 + (s / (N - 1)) * (1 - HOLD0 - HOLD1); }

  // size the panels for this viewport; false if some panel's text still does not fit (then the list is used)
  function fitRail() {
    var tr = rail.track;
    var W = rail.W = root.clientWidth;
    var narrow = W < 1200;
    var pad = Math.max(40, Math.round((W - 1280) / 2 + 40));
    var pw = Math.min(1040, Math.round(W * (narrow ? 0.84 : 0.74)));
    tr.style.setProperty('--padL', pad + 'px');
    tr.style.setProperty('--padR', pad + 'px');
    tr.style.setProperty('--pw', pw + 'px');
    rail.el.style.setProperty('--rail-h', (100 + (N - 1) * STEP_VH) + 'vh');
    // figure: square, as tall as the panel allows, leaving the text column at least ~300px
    var inner = rail.panels[0].clientHeight - 48;
    var fig = Math.max(200, Math.floor(Math.min(inner, pw - 48 - 32 - 300)));
    tr.style.setProperty('--fig', fig + 'px');
    // the text column holds only label, title, one keyword line and a link; smaller type if a short screen needs it
    var fits = true;
    rail.panels.forEach(function (pn) {
      pn.classList.remove('compact');
      var m = pn.querySelector('.p-main');
      if (m.scrollHeight > m.clientHeight + 1) pn.classList.add('compact');
      if (m.scrollHeight > m.clientHeight + 1) fits = false;
    });
    // key translate per panel: centred, clamped to the track ends (I starts left, V ends right)
    var maxT = Math.max(0, tr.offsetWidth - W);
    rail.keys = rail.panels.map(function (pn) {
      return Math.min(maxT, Math.max(0, pn.offsetLeft + pn.offsetWidth / 2 - W / 2));
    });
    return fits;
  }

  function layout() {
    rail.hdr = hdrC();
    rail.on = motion && railMQ.matches && N > 1;
    root.classList.toggle('rail-on', rail.on);
    if (rail.on && !fitRail()) { rail.on = false; root.classList.remove('rail-on'); }
    if (!rail.on) {
      rail.track.style.transform = '';
      rail.panels.forEach(function (pn) { pn.classList.remove('compact'); });
    }
    var rr = rail.el.getBoundingClientRect();
    rail.top = rr.top + window.scrollY;
    rail.dist = Math.max(1, rail.el.offsetHeight - (window.innerHeight - rail.hdr));
    if (hero.el) {
      var hr = hero.el.getBoundingClientRect();
      hero.top = hr.top + window.scrollY;
      hero.h = hr.height;
    }
    if (hero.painter) hero.painter.resize();
    rail.painters.forEach(function (pt) { if (pt) pt.resize(); });
    update();
  }

  function railS() {
    var p = clamp((window.scrollY + rail.hdr - rail.top) / rail.dist);
    return sFromP(p);
  }

  function setActive(i) {
    if (i === rail.active) return;
    rail.active = i;
    rail.links.forEach(function (a, k) { if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }

  function ensureSeq(i, all) {
    if (!motion || !man) return;
    if (!rail.seqs[i]) {
      var key = 'area_' + areas[i].numeral;
      if (!man.sequences[key]) return;
      var seq = rail.seqs[i] = new Scrub.Sequence(man, key, mobileFrames);
      rail.painters[i] = new Scrub.Painter(rail.panels[i].querySelector('canvas'), seq);
    }
    if (all) rail.seqs[i].loadAll(); else rail.seqs[i].loadKeys();
  }

  var ticking = false;
  function onScroll() {
    if (!scrolledOnce && window.scrollY > 4) {
      scrolledOnce = true;
      if (hero.seq) hero.seq.loadAll();
      // list mode: cards that were already in view at load start their frames now
      if (!rail.on) inView.forEach(function (i) { ensureSeq(i, true); });
    }
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
  }

  function update() {
    var y = window.scrollY, vh = window.innerHeight;
    if (hero.painter) hero.painter.set((y) / Math.max(1, hero.top + hero.h - rail.hdr));
    if (rail.on) {
      var s = rail.s = railS();
      var i0 = Math.floor(s), f = s - i0;
      var X = i0 >= N - 1 ? rail.keys[N - 1] : rail.keys[i0] + (rail.keys[i0 + 1] - rail.keys[i0]) * f;
      rail.track.style.transform = 'translate3d(' + (-X).toFixed(1) + 'px,0,0)';
      rail.bar.style.transform = 'scaleX(' + (s / (N - 1)).toFixed(4) + ')';
      setActive(Math.round(s));
      // area frames start only once the rail is coming up: current panel in full, the next one as keyframes
      var near = rail.top - y < vh * 0.9 && y < rail.top + rail.el.offsetHeight;
      // (the lean hero puts the rail top inside the first screen, so wait for the visitor's first scroll)
      if (near && man && scrolledOnce) {
        for (var i = 0; i < N; i++) {
          if (s >= i - 0.6) ensureSeq(i, true);
          else if (s >= i - 1.6) ensureSeq(i, false);
        }
      }
      rail.painters.forEach(function (pt, k) {
        if (!pt) return;
        var a = Math.max(0, k - 1), b = Math.min(N - 1, k + 1);
        pt.set((s - a) / (b - a));
      });
    } else if (motion) {
      // vertical list: each figure scrubs while it crosses the viewport
      rail.painters.forEach(function (pt, k) {
        if (!pt) return;
        var r = rail.panels[k].querySelector('.p-fig').getBoundingClientRect();
        pt.set((vh - r.top) / (vh + r.height));
      });
    }
  }

  function scrollToArea(i, smooth) {
    var y = rail.on ? rail.top - rail.hdr + pFromS(i) * rail.dist : null;
    if (y == null) {
      var el = rail.panels[i];
      if (el) el.scrollIntoView({ block: 'start', behavior: smooth && !reduceMQ.matches ? 'smooth' : 'auto' });
      return;
    }
    window.scrollTo({ top: Math.round(y), behavior: smooth && !reduceMQ.matches ? 'smooth' : 'auto' });
  }

  function initStage() {
    hero.el = $('#welcome');
    rail.el = $('#research');
    rail.stage = $('.rail-stage', rail.el);
    rail.track = $('#track');
    rail.bar = $('.rail-progress span', rail.el);
    rail.panels = [].slice.call(rail.track.querySelectorAll('.panel'));
    rail.links = [].slice.call(document.querySelectorAll('#rail-index a'));
    motion = !reduceMQ.matches;
    mobileFrames = window.innerWidth < 768;

    rail.links.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); scrollToArea(i, true); history.replaceState(null, '', '#area-' + areas[i].numeral); });
    });
    // keyboard focus inside an off-screen panel: bring that panel in by scrolling, never by scrolling the stage
    rail.track.addEventListener('focusin', function (e) {
      if (!rail.on) return;
      var pn = e.target.closest('.panel');
      if (!pn) return;
      rail.stage.scrollLeft = 0;
      var i = +pn.getAttribute('data-i');
      if (Math.abs(rail.s - i) > 0.3) scrollToArea(i, false);
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    var rs; window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(layout, 80); });
    [reduceMQ, railMQ].forEach(function (mq) {
      var fn = function () { motion = !reduceMQ.matches; layout(); };
      if (mq.addEventListener) mq.addEventListener('change', fn); else mq.addListener(fn);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    window.addEventListener('load', layout);
    layout();

    Scrub.manifest().then(function (m) {
      man = m;
      var hs = m.sequences.hero;
      if (hs) {
        var hm = mobileFrames && hs.mobile ? hs.mobile : hs;
        $('#hero-plate').style.setProperty('--hero-ar', hm.width + ' / ' + hm.height);
        var poster = $('#hero-plate .poster');
        if (hs.poster && poster.getAttribute('src') !== '_shared/scroll/' + hs.poster) poster.src = '_shared/scroll/' + hs.poster;
      }
      areas.forEach(function (a, i) {
        var sq = m.sequences['area_' + a.numeral];
        var im = rail.panels[i] && rail.panels[i].querySelector('.poster');
        if (sq && sq.poster && im) im.src = '_shared/scroll/' + sq.poster;
      });
      if (!motion) return; // reduced motion: posters only, no frames requested
      if (hs) {
        hero.seq = new Scrub.Sequence(m, 'hero', mobileFrames);
        hero.painter = new Scrub.Painter($('#hero-plate canvas'), hero.seq);
        // first paint is the poster <img>; frames start after load so they never compete with it
        var start = function () { hero.seq.loadKeys(); if (scrolledOnce) hero.seq.loadAll(); };
        if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
      }
      // list mode: start an area sequence only when its card comes near the viewport
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) {
            var i = +en.target.getAttribute('data-i');
            if (en.isIntersecting) inView.add(i); else inView.delete(i);
            if (en.isIntersecting && !rail.on && scrolledOnce) ensureSeq(i, true);
          });
        }, { rootMargin: '300px 0px' });
        rail.panels.forEach(function (pn) { io.observe(pn); });
      }
      layout();
    }).catch(function () { /* frames are optional; posters and text stay */ });
  }

  function hashTarget(id) {
    var m = /^area-(.+)$/.exec(id);
    if (m) {
      var i = areas.findIndex(function (a) { return a.numeral === m[1]; });
      if (i >= 0) { layout(); scrollToArea(i, false); return true; }
    }
    if (id === 'research' && rail.on) { layout(); window.scrollTo(0, Math.round(rail.top - rail.hdr)); return true; }
    return false;
  }

  function init() {
    if (!D.lab) return;
    renderHero();
    renderResearch();
    renderNewsOpening();
    renderSelected();
    renderAboutContact();
    S.initHeader();
    S.initFooter();
    initStage();
    S.settleHash(hashTarget);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
