/* S6 rail — Research page: the five areas in full (figure, summary, keywords, key papers with full citations).
   This is the content the landing rail carried until v5. Each figure scrubs its own area_* sequence
   while it crosses the viewport; reduced motion shows the poster only. Every fact comes from window.CCEL. */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;
  var cur = D.curation || {};
  var pubs = D.publications || [];
  var areas = S.areas;

  // key papers per area, taken only from the curation lists: pins for that area first, then recent highlights
  // whose area matches (at most 3). If neither has one, the newest published paper of the area (data order).
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
    return out.slice(0, 3);
  }

  function render() {
    var r = D.research || {};
    $('#rs-headline').textContent = r.headline || '';
    $('#rs-subnav').innerHTML = areas.map(function (a) {
      return '<li><a href="#area-' + esc(a.numeral) + '">' + esc(a.numeral) + '. ' + esc(a.title) + '</a></li>';
    }).join('');
    $('#rs-intro').innerHTML = (r.intro || []).map(function (t) { return '<p>' + S.rich(t) + '</p>'; }).join('');
    if (r.image) {
      $('#rs-figure').innerHTML = '<img loading="lazy" decoding="async" src="' + esc(S.img(r.image)) + '" alt="' +
        esc((D.lab.short || '') + ' research approach: computational materials design, artificial intelligence and experimental validation') + '">';
    }
    $('#rs-list').innerHTML = areas.map(function (a, i) {
      var n = esc(a.numeral), kp = keyPapers(a.numeral);
      return '<article class="rs-area" id="area-' + n + '" data-i="' + i + '" aria-labelledby="area-' + n + '-t">' +
        '<div class="a-side">' +
          '<figure class="plate a-fig"><img class="poster" alt="Illustration for research area ' + n + ': ' + esc(a.title) + '" decoding="async" loading="lazy">' +
          '<canvas aria-hidden="true"></canvas></figure>' +
          '<ul class="kw" aria-label="Keywords">' + (a.keywords || []).map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>' +
          '<a class="a-all" href="publications.html?area=' + n + '&amp;status=published">Published papers in area ' + n + '</a>' +
        '</div>' +
        '<div class="a-main">' +
          '<p class="a-label">Research area ' + n + '</p>' +
          '<h2 id="area-' + n + '-t">' + S.rich(a.title) + '</h2>' +
          '<p class="a-sum">' + S.rich(S.areaSummary(a)) + '</p>' +
          (kp.length ? '<p class="a-papers-h">Key ' + (kp.length > 1 ? 'papers' : 'paper') + '</p><ol class="a-papers">' +
            kp.map(function (p) { return '<li>' + S.citeHtml(p) + '</li>'; }).join('') + '</ol>' : '') +
        '</div></article>';
    }).join('');
  }

  /* short scrubs: each figure plays its sequence while it crosses the viewport */
  function initScrub() {
    var Scrub = window.S6Scrub;
    var cards = [].slice.call(document.querySelectorAll('#rs-list .rs-area'));
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mobile = window.innerWidth < 768;
    var painters = [];
    Scrub.manifest().then(function (m) {
      cards.forEach(function (c, i) {
        var sq = m.sequences['area_' + areas[i].numeral];
        var im = c.querySelector('.poster');
        if (sq && sq.poster) im.src = '_shared/scroll/' + sq.poster;
        else if (areas[i].image) im.src = S.img(areas[i].image);
      });
      if (reduce) return;  // posters only, no frame requests
      var seqs = [];
      var start = function (i) {
        if (seqs[i]) return;
        var key = 'area_' + areas[i].numeral;
        if (!m.sequences[key]) return;
        seqs[i] = new Scrub.Sequence(m, key, mobile);
        painters[i] = new Scrub.Painter(cards[i].querySelector('canvas'), seqs[i]);
        seqs[i].loadAll();
        update();
      };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) { if (en.isIntersecting) start(+en.target.getAttribute('data-i')); });
        }, { rootMargin: '200px 0px' });
        cards.forEach(function (c) { io.observe(c); });
      } else cards.forEach(function (c, i) { start(i); });
    }).catch(function () {
      // no manifest: the research figures from the data stay as stills
      cards.forEach(function (c, i) { if (areas[i].image) c.querySelector('.poster').src = S.img(areas[i].image); });
    });

    var ticking = false;
    function update() {
      var vh = window.innerHeight;
      painters.forEach(function (pt, k) {
        if (!pt) return;
        var r = cards[k].querySelector('.a-fig').getBoundingClientRect();
        pt.set((vh - r.top) / (vh + r.height));
      });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
    }, { passive: true });
    var rs; window.addEventListener('resize', function () {
      clearTimeout(rs); rs = setTimeout(function () { painters.forEach(function (pt) { if (pt) pt.resize(); }); update(); }, 80);
    });
  }

  function init() {
    if (!D.lab) return;
    document.title = 'Research — ' + (D.lab.short || '');
    render();
    S.initHeader();
    S.initFooter();
    initScrub();
    S.settleHash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
