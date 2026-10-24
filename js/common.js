/* S6 rail — helpers shared by index, members and publications. Every fact comes from window.CCEL. */
(function () {
  'use strict';
  var D = window.CCEL || {};
  var SH = '_shared/';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // titles/authors carry only <sub>/<sup>: keep those, escape the rest
  function rich(s) { return esc(s).replace(/&lt;(\/?)(sub|sup)&gt;/g, '<$1$2>'); }
  function img(p) { return p ? SH + p : ''; }
  function https(u) { return u ? String(u).replace(/^http:\/\//i, 'https://') : u; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function plain(html) { return String(html || '').replace(/<[^>]+>/g, ''); }

  var STATUS = { published: 'Published', submitted: 'Submitted', 'in revision': 'In revision', accepted: 'Accepted', 'in press': 'In press' };
  var PENDING = { submitted: 1, 'in revision': 1 };

  var pubs = D.publications || [];
  var byNo = {};
  pubs.forEach(function (p) { byNo[p.no] = p; });
  var areas = (D.research && D.research.areas) || [];
  var areaBy = {};
  areas.forEach(function (a) { areaBy[a.numeral] = a; });
  var profName = (D.professor && D.professor.name) || '';

  // area summaries in the data start with "I. <title> "; the panel shows the title separately
  function areaSummary(a) {
    var s = a.summary || '', pre = a.numeral + '. ' + a.title;
    if (s.indexOf(pre) === 0) s = s.slice(pre.length);
    return s.trim();
  }

  // covers attach to a paper only on a DOI / URL / PII match (never by index)
  function normUrl(u) { return String(u || '').toLowerCase().replace(/^http:\/\//, 'https://').replace(/#.*$/, '').replace(/\/+$/, ''); }
  var coverOf = {};
  (D.cover_publications || []).forEach(function (c) {
    var cu = normUrl(c.url), cd = (c.doi || '').toLowerCase();
    for (var i = 0; i < pubs.length; i++) {
      var p = pubs[i], pd = (p.doi || '').toLowerCase();
      var hit = (cd && pd && cd === pd) || (cu && p.url && cu === normUrl(p.url)) ||
        (cu && pd && cu.indexOf(pd) >= 0) || (cu && p.pii && cu.indexOf(String(p.pii).toLowerCase()) >= 0);
      if (hit) { c._no = p.no; if (!coverOf[p.no] || coverOf[p.no].kind !== 'front') coverOf[p.no] = c; break; }
    }
  });
  function frontCover(p) { var c = coverOf[p.no]; return c && c.kind === 'front' ? c : null; }

  function paperUrl(p) { return p.doi ? 'https://doi.org/' + p.doi : https(p.url); }

  function authorsHtml(p) {
    var h = rich(p.authors);
    var names = (p.ccel_authors || []).concat(profName ? [profName] : []).filter(Boolean)
      .map(esc).sort(function (a, b) { return b.length - a.length; });
    if (!names.length) return h;
    var re = new RegExp('(?<![A-Za-z])(' + names.map(reEsc).join('|') + ')(?![A-Za-z])', 'g');
    return h.replace(re, '<b>$1</b>');
  }

  // "ACS Energy Lett. 10 (2025) 6288-6296" from citation_tail; pending papers say status + year
  function sourceText(p) {
    var ct = p.citation_tail || '';
    if (p.journal) {
      var i = ct.lastIndexOf(p.journal);
      var s = i >= 0 ? ct.slice(i) : p.journal + ' (' + p.year + ')';
      return s.replace(/\s*\(IF\s*=[^)]*\)\s*\.?\s*$/i, '').replace(/[.\s]+$/, '');
    }
    return (STATUS[p.status] || p.status) + ' (' + p.year + ')';
  }

  function ifHtml(p) {
    if (p.impact_factor == null) return '';
    var prov = p.if_provisional === true
      ? '<span class="prov" title="Provisional: the JCR value for this year is not out yet"> (provisional)</span>' : '';
    return '<span class="if">IF ' + esc(p.impact_factor) + prov + '</span>';
  }

  /* opts: {area:true, cover:false, level:'span'} */
  function citeHtml(p, opts) {
    opts = opts || {};
    var url = paperUrl(p);
    var t = rich(p.title);
    var title = url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + t + '</a>' : t;
    var meta = [];
    if (p.status && p.status !== 'published') meta.push('<span class="tag st">' + esc(STATUS[p.status] || p.status) + '</span>');
    if (opts.area && p.area && areaBy[p.area]) meta.push('<span class="tag area" title="' + esc(areaBy[p.area].title) + '">Area ' + esc(p.area) + '</span>');
    if (p.highlight) meta.push('<span class="tag hl">' + esc(p.highlight) + '</span>');
    if (opts.coverBadge && coverOf[p.no]) meta.push('<span class="tag hl">Journal cover</span>');
    var ifh = ifHtml(p); if (ifh) meta.push(ifh);
    if (p.doi) meta.push('<a class="doi" href="https://doi.org/' + esc(p.doi) + '" target="_blank" rel="noopener">doi:' + esc(p.doi) + '</a>');
    else if (url) meta.push('<a class="doi" href="' + esc(url) + '" target="_blank" rel="noopener">Article link</a>');
    return '<div class="cite"><span class="t">' + title + '</span>' +
      '<span class="au">' + authorsHtml(p) + '</span>' +
      '<span class="src">' + esc(sourceText(p)) + '</span>' +
      (meta.length ? '<span class="meta">' + meta.join('') + '</span>' : '') + '</div>';
  }

  /* people */
  function splitName(n) {
    var m = /^(.*?)\s*\((.*)\)\s*$/.exec(n || '');
    return m ? { name: m[1], note: m[2] } : { name: n || '', note: '' };
  }
  var ICONS = {
    github: ['GitHub', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>'],
    linkedin: ['LinkedIn', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>'],
    cv: ['CV', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 2.8h8.2L19 7.6v13.6H6z"/><path d="M14 2.8v5h5M8.8 12.2h7.4M8.8 15.4h7.4M8.8 18.4h4.6"/></svg>'],
    scholar: ['Google Scholar', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.5 1 9.6l4.6 3V17c0 2.3 2.9 4.5 6.4 4.5s6.4-2.2 6.4-4.5v-4.4l3.6-2.4V16h1.6V9.6L12 2.5Zm4.8 14.5c0 1.2-2 2.9-4.8 2.9s-4.8-1.7-4.8-2.9v-3.3l4.8 3.1 4.8-3.1V17Z"/></svg>'],
    homepage: ['Homepage', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4M12 2.8c2.6 2.6 3.8 5.8 3.8 9.2s-1.2 6.6-3.8 9.2c-2.6-2.6-3.8-5.8-3.8-9.2S9.4 5.4 12 2.8Z"/></svg>']
  };
  var ORDER = ['github', 'linkedin', 'cv', 'scholar', 'homepage'];
  // only links that are set; a null link renders nothing
  function linksHtml(name, links) {
    links = links || {};
    var out = ORDER.filter(function (k) { return links[k]; }).map(function (k) {
      var href = /^https?:\/\//i.test(links[k]) ? https(links[k]) : img(links[k]);
      var label = esc(name + ' — ' + ICONS[k][0]);
      return '<a href="' + esc(href) + '" target="_blank" rel="noopener" aria-label="' + label + '" title="' + label + '">' + ICONS[k][1] + '</a>';
    });
    return out.length ? '<span class="links">' + out.join('') + '</span>' : '';
  }
  function profLinks(p) {
    var l = (p && p.links) || {};
    return linksHtml(p.name, { scholar: l.google_scholar, cv: l.cv });
  }
  function typeDot(t) {
    if (t === 'computational') return '<span class="dot c" aria-hidden="true"></span><span class="vh">(computational)</span>';
    if (t === 'experimental') return '<span class="dot e" aria-hidden="true"></span><span class="vh">(experimental)</span>';
    return '';
  }
  function countPeople(groups) { return (groups || []).reduce(function (n, g) { return n + (g.people || []).length; }, 0); }

  /* header: compact bar after the first scroll, mobile menu */
  function initHeader() {
    var root = document.documentElement;
    var logo = $('.site-hdr .ccel-logo');
    if (logo && D.lab) {
      if (D.lab.logo) logo.src = img(D.lab.logo);
      logo.alt = (D.lab.short || '') + ' — ' + (D.lab.name || '');
    }
    var onScroll = function () { root.classList.toggle('is-compact', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    var btn = $('.menu-btn'), nav = $('#site-nav');
    if (btn && nav) {
      btn.addEventListener('click', function () {
        var open = !nav.classList.contains('open');
        nav.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
      });
    }
  }

  function initFooter() {
    var f = $('#ftr-info');
    if (!f || !D.lab) return;
    var c = D.contact || {};
    f.innerHTML = '<strong>' + esc(D.lab.name) + '</strong>' +
      '<span>' + esc(c.address || D.lab.affiliation || '') + '</span><br>' +
      (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '');
  }

  // content is rendered after load, so the browser's own jump to #hash can miss: redo it, and keep the
  // target in place while late fonts/images reflow the page above it, until the visitor scrolls or 4 s pass
  function settleHash(scrollFn) {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    var stop = false;
    var go = function () {
      if (stop) return;
      if (scrollFn && scrollFn(id)) return;
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'start' });
    };
    go();
    var quit = function () { stop = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
      window.addEventListener(ev, quit, { once: true, passive: true });
    });
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(go);
      ro.observe(document.body);
      setTimeout(function () { ro.disconnect(); stop = true; }, 4000);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    window.addEventListener('load', go, { once: true });
  }

  window.S6 = {
    D: D, SH: SH, esc: esc, rich: rich, img: img, https: https, $: $, plain: plain,
    STATUS: STATUS, PENDING: PENDING, byNo: byNo, areas: areas, areaBy: areaBy,
    areaSummary: areaSummary, coverOf: coverOf, frontCover: frontCover, paperUrl: paperUrl,
    authorsHtml: authorsHtml, sourceText: sourceText, ifHtml: ifHtml, citeHtml: citeHtml,
    splitName: splitName, linksHtml: linksHtml, profLinks: profLinks, typeDot: typeDot, countPeople: countPeople,
    initHeader: initHeader, initFooter: initFooter, settleHash: settleHash
  };
})();
