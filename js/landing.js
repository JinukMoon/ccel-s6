/* S6 rail — landing page. Renders from window.CCEL, then wires the two scroll-linked canvases:
   the hero clip (scrubs while the hero scrolls away, not pinned) and the research rail
   (a sticky stage whose track of area panels is moved by a CSS transform from native vertical scroll). */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;
  var root = document.documentElement;
  var cur = D.curation || {};
  var pubs = D.publications || [];
  var areas = S.areas;
  var N = areas.length;

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var railMQ = window.matchMedia('(min-width: 960px) and (min-height: 600px)');

  /* ------------------------------------------------------------------ render */
  function publishedCount(filter) {
    return pubs.filter(function (p) { return p.status === 'published' && (!filter || filter(p)); }).length;
  }

  // 1-2 key papers per area, taken only from the curation lists: pins for that area first,
  // then recent highlights whose area matches. If neither has one, the newest published paper of the area (data order).
  function keyPapers(numeral) {
    var out = [];
    (cur.selected_pins || []).forEach(function (pin) {
      var p = S.byNo[pin.no];
      if (p && pin.area === numeral && out.indexOf(p) < 0) out.push(p);
    });
    (cur.recent_highlights || []).forEach(function (no) {
      var p = S.byNo[no];
      if (p && p.area === numeral && out.indexOf(p) < 0) out.push(p);
    });
    if (!out.length) {
      for (var i = 0; i < pubs.length; i++) if (pubs[i].area === numeral && pubs[i].status === 'published') { out.push(pubs[i]); break; }
    }
    return out.slice(0, 2);
  }

  function renderHero() {
    var lab = D.lab || {}, r = D.research || {};
    document.title = (lab.short || '') + ' — ' + (lab.name || '');
    $('#hero-aff').textContent = lab.affiliation || '';
    $('#hero-title').textContent = lab.name || '';
    $('#hero-identity').textContent = r.headline || D.welcome.tagline || '';
    $('#hero-intro').textContent = (r.intro && r.intro[0]) || '';
    var facts = [
      [publishedCount(), 'published papers'],
      [N, 'research areas'],
      [S.countPeople(D.members), 'current members'],
      [S.countPeople(D.alumni), 'alumni']
    ];
    $('#facts').innerHTML = facts.map(function (f) { return '<li><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></li>'; }).join('');
  }

  function renderResearch() {
    var r = D.research || {};
    $('#rh-sub').textContent = (r.intro && r.intro[1]) || '';
    $('#rail-index').innerHTML = areas.map(function (a, i) {
      return '<li><a href="#area-' + esc(a.numeral) + '" data-i="' + i + '" title="' + esc(a.title) + '"><span class="n">' + esc(a.numeral) +
        '</span><span class="l">' + esc(a.title) + '</span></a></li>';
    }).join('');
    $('#track').innerHTML = areas.map(function (a, i) {
      var n = esc(a.numeral);
      var kp = keyPapers(a.numeral);
      var count = publishedCount(function (p) { return p.area === a.numeral; });
      return '<article class="panel" id="area-' + n + '" data-i="' + i + '" aria-labelledby="area-' + n + '-t">' +
        '<div class="p-side">' +
          '<figure class="plate p-fig"><img class="poster" alt="Illustration for research area ' + n + ': ' + esc(a.title) + '" decoding="async">' +
          '<canvas aria-hidden="true"></canvas></figure>' +
          '<ul class="kw" aria-label="Keywords">' + (a.keywords || []).map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>' +
          '<a class="p-all" href="publications.html?area=' + n + '&amp;status=published">All ' + count + ' published papers in area ' + n + '</a>' +
        '</div>' +
        '<div class="p-main">' +
          '<p class="p-label">Research area ' + n + '</p>' +
          '<h3 id="area-' + n + '-t">' + esc(a.title) + '</h3>' +
          '<p class="p-sum">' + S.rich(S.areaSummary(a)) + '</p>' +
          (kp.length ? '<p class="p-papers-h">Key ' + (kp.length > 1 ? 'papers' : 'paper') + '</p><ol class="p-papers">' +
            kp.map(function (p) { return '<li>' + S.citeHtml(p) + '</li>'; }).join('') + '</ol>' : '') +
        '</div></article>';
    }).join('');
  }

  function coverImg(c, p, cls) {
    var alt = p ? 'Journal cover: ' + S.plain(p.title) : 'Journal cover';
    return '<a class="' + cls + '" href="' + esc(S.paperUrl(p) || S.https(c.url)) + '" target="_blank" rel="noopener">' +
      '<img loading="lazy" decoding="async" src="' + esc(S.img(c.image)) + '" alt="' + esc(alt) + '"></a>';
  }

  function renderPublications() {
    var pins = (cur.selected_pins || []).map(function (pin) { return { p: S.byNo[pin.no], area: pin.area }; })
      .filter(function (x) { return x.p; });
    $('#sel-list').innerHTML = pins.map(function (x) {
      var a = S.areaBy[x.area];
      var cv = S.frontCover(x.p);
      return '<li><div class="sel-area">' + (a ? '<span class="n">Area ' + esc(a.numeral) + '</span>' + esc(a.title) : '') + '</div>' +
        S.citeHtml(x.p) + (cv ? coverImg(cv, x.p, 'cover-thumb') : '<span></span>') + '</li>';
    }).join('');
    var hl = (cur.recent_highlights || []).map(function (no) { return S.byNo[no]; }).filter(Boolean);
    $('#hl-grid').innerHTML = hl.map(function (p) {
      var cv = S.frontCover(p);
      return '<li class="' + (cv ? '' : 'no-cover') + '">' + S.citeHtml(p, { area: true }) + (cv ? coverImg(cv, p, 'cover-thumb') : '') + '</li>';
    }).join('');
    $('#rules').textContent = cur.rules || '';
    if (cur.updated_at) $('#rules').insertAdjacentHTML('beforeend', ' <span>(Last updated ' + esc(cur.updated_at) + '.)</span>');
    var fronts = (D.cover_publications || []).filter(function (c) { return c.kind === 'front'; });
    $('#cover-count').textContent = 'All ' + (D.cover_publications || []).length + ' covers';
    $('#cover-row').innerHTML = fronts.slice(0, 6).map(function (c) {
      var p = c._no != null ? S.byNo[c._no] : null;
      var cap = p ? (p.journal || '') + ' (' + p.year + ')' : '';
      return '<li><a href="' + esc(p ? S.paperUrl(p) : S.https(c.url)) + '" target="_blank" rel="noopener"><span class="cv">' +
        '<img loading="lazy" decoding="async" src="' + esc(S.img(c.image)) + '" alt="' + esc(p ? 'Journal cover: ' + S.plain(p.title) : 'Journal cover') + '"></span>' +
        (cap ? '<span class="cap">' + esc(cap) + '</span>' : '') + '</a></li>';
    }).join('');
  }

  function renderPeople() {
    var pr = D.professor || {};
    $('#prof-card').innerHTML = (pr.photo ? '<img loading="lazy" src="' + esc(S.img(pr.photo)) + '" alt="' + esc(pr.name) + '">' : '') +
      '<div><h3>' + esc(pr.name) + '</h3>' +
      '<p class="role">' + esc(pr.title || '') + '</p>' +
      (pr.roles || []).map(function (r) { return '<p class="role">' + esc(r) + '</p>'; }).join('') +
      (pr.email ? '<a class="mail" href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a>' : '') +
      S.profLinks(pr) +
      '<p style="margin-top:10px"><a class="more" href="members.html#professor">Profile, education and experience</a></p></div>';
    var gp = D.contact && D.contact.group_photo;
    if (gp) {
      $('#group-photo').innerHTML = '<div class="ph"><img loading="lazy" decoding="async" src="' + esc(S.img(gp)) + '" alt="' + esc((D.lab.short || '') + ' group photo') + '"></div>' +
        '<figcaption>' + esc(D.lab.name) + '</figcaption>';
    }
    $('#member-cols').innerHTML = (D.members || []).map(function (g) {
      return '<div><h3>' + esc(g.group) + ' <span>' + g.people.length + '</span></h3><ul>' + g.people.map(function (p) {
        var nm = S.splitName(p.name);
        return '<li>' + S.typeDot(p.type) + '<span>' + esc(nm.name) + '</span>' + S.linksHtml(nm.name, p.links) + '</li>';
      }).join('') + '</ul></div>';
    }).join('');
    $('#alumni-line').innerHTML = esc(S.countPeople(D.alumni)) + ' alumni are listed with their current positions. ' +
      '<a class="more" href="members.html#alumni">Alumni</a>';
  }

  function renderNewsJoinContact() {
    var w = D.welcome || {}, c = D.contact || {}, pr = D.professor || {};
    $('#news-list').innerHTML = (w.news || []).map(function (n) {
      return '<li>' + (n.date ? '<span class="small">' + esc(n.date) + '</span> ' : '') + esc(n.text) + '</li>';
    }).join('');
    $('#join-contact').innerHTML = 'Contact ' + esc(pr.name) + ' at <a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a>.';
    $('#opening-ko').textContent = w.opening_ko || '';
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
  var motion = false, mobileFrames = false, man = null, scrolledOnce = false;

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
    var pw = Math.min(1080, Math.round(W * (narrow ? 0.86 : 0.78)));
    tr.style.setProperty('--padL', pad + 'px');
    tr.style.setProperty('--padR', pad + 'px');
    tr.style.setProperty('--pw', pw + 'px');
    rail.el.style.setProperty('--rail-h', (100 + (N - 1) * 70) + 'vh');
    // figure size: square, as tall as the panel allows, leaving room for keywords and the area link
    var inner = rail.panels[0].clientHeight - 48;
    var fig = Math.floor(Math.min(inner - 120, pw * (narrow ? 0.4 : 0.44)));
    tr.style.setProperty('--fig', fig + 'px');
    var over = 0;
    rail.panels.forEach(function (pn) { var sd = pn.querySelector('.p-side'); over = Math.max(over, sd.scrollHeight - sd.clientHeight); });
    if (over > 0) tr.style.setProperty('--fig', Math.max(200, fig - over - 4) + 'px');
    // fit the text column: compact type, then one key paper, then clamp author lists
    var fits = true;
    rail.panels.forEach(function (pn) {
      pn.classList.remove('compact', 'one-paper', 'tight');
      var m = pn.querySelector('.p-main');
      ['compact', 'one-paper', 'tight'].forEach(function (cls) {
        if (m.scrollHeight > m.clientHeight + 1) pn.classList.add(cls);
      });
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
      rail.panels.forEach(function (pn) { pn.classList.remove('compact', 'one-paper', 'tight'); });
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
      if (near && man) {
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
            if (en.isIntersecting && !rail.on) ensureSeq(+en.target.getAttribute('data-i'), true);
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
    renderPublications();
    renderPeople();
    renderNewsJoinContact();
    S.initHeader();
    S.initFooter();
    initStage();
    S.settleHash(hashTarget);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
