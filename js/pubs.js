/* S6 rail — Publications: every entry of CCEL.publications, newest first, grouped by year
   (publication_counts), with search and filters; Selected and Covers views from curation / cover_publications. */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;
  var pubs = D.publications || [];
  var cur = D.curation || {};

  function years() {
    var ys = Object.keys(D.publication_counts || {});
    pubs.forEach(function (p) { if (ys.indexOf(String(p.year)) < 0) ys.push(String(p.year)); });
    return ys.sort(function (a, b) { return b - a; });
  }

  function entry(p) {
    return '<li data-no="' + p.no + '"><span class="no">[' + esc(p.no) + ']</span>' + S.citeHtml(p, { area: true, coverBadge: true }) + '</li>';
  }

  // within a year, data order is kept; manuscripts still under review (submitted / in revision) get their own sub-list
  // after the published work, so a year never opens with unpublished papers
  function renderAll() {
    var counts = D.publication_counts || {};
    var html = years().map(function (y) {
      var list = pubs.filter(function (p) { return String(p.year) === y; });
      var done = list.filter(function (p) { return !S.PENDING[p.status]; });
      var pend = list.filter(function (p) { return S.PENDING[p.status]; });
      var nPub = list.filter(function (p) { return p.status === 'published'; }).length;
      var total = counts[y] != null ? counts[y] : list.length;
      var meta = total + (total === 1 ? ' entry' : ' entries') + (nPub !== total ? ' · ' + nPub + ' published' : '');
      return '<section class="year" data-year="' + y + '" aria-labelledby="y-' + y + '"><h2 id="y-' + y + '">' + y + ' <span>' + meta + '</span></h2>' +
        (done.length ? (pend.length ? '<h3>Published and in press</h3>' : '') + '<ol class="plist">' + done.map(entry).join('') + '</ol>' : '') +
        (pend.length ? '<h3>Submitted and in revision</h3><ol class="plist pending">' + pend.map(entry).join('') + '</ol>' : '') +
        '</section>';
    }).join('');
    $('#years').innerHTML = html;
  }

  function fillFilters() {
    $('#f-year').innerHTML = '<option value="">All years</option>' + years().map(function (y) {
      return '<option value="' + y + '">' + y + '</option>';
    }).join('');
    var st = [];
    pubs.forEach(function (p) { if (st.indexOf(p.status) < 0) st.push(p.status); });
    $('#f-status').innerHTML = '<option value="">All statuses</option>' + st.map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(S.STATUS[s] || s) + '</option>';
    }).join('');
    $('#f-area').innerHTML = '<option value="">All research areas</option>' + S.areas.map(function (a) {
      return '<option value="' + esc(a.numeral) + '">' + esc(a.numeral + '. ' + a.title) + '</option>';
    }).join('') + '<option value="none">Not assigned to an area</option>';
  }

  var index = [];
  function buildIndex() {
    var items = document.querySelectorAll('#years li[data-no]');
    index = [].map.call(items, function (li) {
      var p = S.byNo[li.getAttribute('data-no')];
      return { li: li, p: p, text: (S.plain(p.title) + ' ' + S.plain(p.authors) + ' ' + (p.journal || '') + ' ' + p.citation_tail).toLowerCase() };
    });
  }

  function apply() {
    var q = $('#f-q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var y = $('#f-year').value, st = $('#f-status').value, ar = $('#f-area').value, lab = $('#f-lab').checked;
    var shown = 0;
    index.forEach(function (it) {
      var p = it.p;
      var ok = (!y || String(p.year) === y) && (!st || p.status === st) &&
        (!ar || (ar === 'none' ? !p.area : p.area === ar)) && (!lab || p.lab_led) &&
        q.every(function (w) { return it.text.indexOf(w) >= 0; });
      it.li.hidden = !ok;
      if (ok) shown++;
    });
    document.querySelectorAll('#years .plist').forEach(function (ol) {
      var vis = !!ol.querySelector('li:not([hidden])');
      ol.hidden = !vis;
      var h = ol.previousElementSibling;
      if (h && h.tagName === 'H3') h.hidden = !vis;
    });
    document.querySelectorAll('#years .year').forEach(function (sec) { sec.hidden = !sec.querySelector('li:not([hidden])'); });
    $('#pub-count').textContent = 'Showing ' + shown + ' of ' + pubs.length + ' entries' + (shown === pubs.length ? ', newest first.' : '.');
    $('#no-match').hidden = shown > 0;
  }

  function coverLi(c) {
    var p = c._no != null ? S.byNo[c._no] : null;
    var href = p ? S.paperUrl(p) : S.https(c.url);
    var alt = p ? 'Journal cover: ' + S.plain(p.title) : 'Journal cover';
    var cap = p ? '<b>' + esc(p.journal || '') + ' (' + p.year + ')</b><br>' + S.rich(p.title) : '';
    if (c.kind === 'back_page') cap += (cap ? '<br>' : '') + 'Back or inside cover page';
    return '<li><a href="' + esc(href) + '" target="_blank" rel="noopener"><span class="cv"><img loading="lazy" decoding="async" src="' +
      esc(S.img(c.image)) + '" alt="' + esc(alt) + '"></span><span class="cap">' + cap + '</span></a></li>';
  }

  function renderSelected() {
    var pins = (cur.selected_pins || []).map(function (pin) { return { p: S.byNo[pin.no], area: pin.area }; }).filter(function (x) { return x.p; });
    $('#sel-list').innerHTML = pins.map(function (x) {
      var a = S.areaBy[x.area], cv = S.frontCover(x.p);
      return '<li><div class="sel-area">' + (a ? '<span class="n">Area ' + esc(a.numeral) + '</span>' + esc(a.title) : '') + '</div>' + S.citeHtml(x.p) +
        (cv ? '<a class="cover-thumb" href="' + esc(S.paperUrl(x.p)) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(S.img(cv.image)) + '" alt="' + esc('Journal cover: ' + S.plain(x.p.title)) + '"></a>' : '<span></span>') + '</li>';
    }).join('');
    var hl = (cur.recent_highlights || []).map(function (no) { return S.byNo[no]; }).filter(Boolean);
    $('#hl-list').innerHTML = hl.map(function (p) {
      var cv = S.frontCover(p);
      return '<li class="' + (cv ? '' : 'no-cover') + '">' + S.citeHtml(p, { area: true }) +
        (cv ? '<a class="cover-thumb" href="' + esc(S.paperUrl(p)) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(S.img(cv.image)) + '" alt="' + esc('Journal cover: ' + S.plain(p.title)) + '"></a>' : '') + '</li>';
    }).join('');
    $('#sel-rules').textContent = cur.rules || '';
    // legacy 2018-2022 set (kept for its abstracts)
    $('#earlier').innerHTML = (D.selected_publications || []).map(function (sp) {
      var href = sp.doi ? 'https://doi.org/' + sp.doi : S.https(sp.url);
      var au = S.rich(String(sp.authors_citation || '').replace(/\s*\(IF\s*=[^)]*\)\s*\.?\s*$/i, ''));
      return '<li><div class="cite"><span class="t">' + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + S.rich(sp.title) + '</a>' : S.rich(sp.title)) + '</span>' +
        '<span class="au">' + au + '</span>' +
        (sp.highlight ? '<span class="meta"><span class="tag hl">' + esc(sp.highlight) + '</span></span>' : '') +
        (sp.abstract ? '<details class="rules"><summary>Abstract</summary><p>' + S.rich(sp.abstract) + '</p></details>' : '') + '</div></li>';
    }).join('');
  }

  function renderCovers() {
    var cv = D.cover_publications || [];
    $('#covers-sub').textContent = cv.length + ' journal covers, newest first. Each links to its paper.';
    $('#covers-grid').innerHTML = cv.map(coverLi).join('');
  }

  // views: #selected, #covers, everything else = all publications
  function showView() {
    var h = (location.hash || '').slice(1);
    var v = h === 'selected' || h === 'covers' ? h : 'all';
    ['all', 'selected', 'covers'].forEach(function (k) {
      $('#view-' + k).hidden = k !== v;
      var t = $('#tab-' + k);
      if (k === v) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
      t.setAttribute('aria-selected', String(k === v));
    });
    return v;
  }

  function init() {
    if (!D.lab) return;
    document.title = 'Publications — ' + (D.lab.short || '');
    var nPub = pubs.filter(function (p) { return p.status === 'published'; }).length;
    var nOther = pubs.length - nPub;
    $('#pub-sub').textContent = pubs.length + ' entries: ' + nPub + ' published papers and ' + nOther +
      ' in press, in revision or submitted. Lab members are in bold; IF is the journal impact factor printed for the publication year.';
    fillFilters();
    renderAll();
    buildIndex();
    renderSelected();
    renderCovers();
    var qs = new URLSearchParams(location.search);
    if (qs.get('area')) $('#f-area').value = qs.get('area');
    if (qs.get('status')) $('#f-status').value = qs.get('status');
    if (qs.get('year')) $('#f-year').value = qs.get('year');
    if (qs.get('q')) $('#f-q').value = qs.get('q');
    var t;
    $('#f-q').addEventListener('input', function () { clearTimeout(t); t = setTimeout(apply, 120); });
    ['#f-year', '#f-status', '#f-area', '#f-lab'].forEach(function (s) { $(s).addEventListener('change', apply); });
    $('#f-reset').addEventListener('click', function () {
      $('#f-q').value = ''; $('#f-year').value = ''; $('#f-status').value = ''; $('#f-area').value = ''; $('#f-lab').checked = false; apply();
    });
    apply();
    showView();
    window.addEventListener('hashchange', function () { showView(); window.scrollTo(0, 0); });
    S.initHeader();
    S.initFooter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
