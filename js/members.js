/* S6 rail — Members page: current members first; an Alumni view behind its own button, kept in the URL hash
   (#alumni, #alumni-<group>, #members-<group>) so deep links, reloads and the back button all agree.
   All people data from window.CCEL (English only). The professor has his own page (professor.html). */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;
  var root = document.documentElement;

  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'group'; }
  function groupIds(groups, prefix) {
    var seen = {};
    return (groups || []).map(function (g) {
      var id = prefix + '-' + slug(g.group);
      if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
      return id;
    });
  }

  function card(p, alumni) {
    var nm = S.splitName(p.name);
    var ty = p.type === 'computational' || p.type === 'experimental'
      ? '<span class="ty"><span class="dot ' + p.type.charAt(0) + '" aria-hidden="true"></span>' + (p.type === 'computational' ? 'Computational' : 'Experimental') + '</span>' : '';
    // alumni: the data's current_position as written, "N/A" included
    var pos = alumni && p.current_position ? '<p class="pos"><span class="k">Current position</span>' + esc(p.current_position) + '</p>' : '';
    var ra = !alumni && p.research_area ? '<p class="ra">' + esc(p.research_area) + '</p>' : '';
    var deg = (p.degrees || []).length ? '<details><summary>Education</summary><ul>' + p.degrees.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></details>' : '';
    var mail = !alumni && p.email ? '<p class="contact"><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></p>' : '';
    return '<li class="card" data-type="' + esc(p.type || '') + '">' +
      '<div class="ph">' + (p.photo ? '<img loading="lazy" decoding="async" src="' + esc(S.img(p.photo)) + '" alt="' + esc(nm.name) + '">' : '') + '</div>' +
      '<div><p class="nm">' + esc(nm.name) + '</p>' + (nm.note ? '<span class="note">' + esc(nm.note) + '</span>' : '') +
      ty + pos + ra + mail + S.linksHtml(nm.name, p.links) + deg + '</div></li>';
  }

  function groupsHtml(groups, ids, alumni) {
    return (groups || []).map(function (g, i) {
      return '<div class="grp" id="' + ids[i] + '"><h3>' + esc(g.group) + ' <span>' + g.people.length + '</span></h3>' +
        '<ul class="cards">' + g.people.map(function (p) { return card(p, alumni); }).join('') + '</ul></div>';
    }).join('');
  }
  function jumpsHtml(groups, ids) {
    return (groups || []).map(function (g, i) { return '<li><a href="#' + ids[i] + '">' + esc(g.group) + '</a></li>'; }).join('');
  }

  /* ---------- view: current members | alumni ---------- */
  function viewOf(id) {
    if (id === 'members' || id.indexOf('members-') === 0) return 'members';
    if (id === 'alumni' || id.indexOf('alumni-') === 0) return 'alumni';
    return null;
  }
  function hashId() { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return location.hash.slice(1); } }

  function setView(v) {
    root.classList.toggle('view-alumni', v === 'alumni');
    [].forEach.call(document.querySelectorAll('.vs'), function (a) {
      if (a.getAttribute('data-show') === v) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    document.title = (v === 'alumni' ? 'Alumni' : 'Members') + ' — ' + (D.lab.short || '');
  }

  function hdrBottom() { var h = $('.site-hdr'); return h ? h.getBoundingClientRect().bottom : 0; }
  // is the target's heading on screen below the header (and, for a view, the switch too)?
  function inView(id) {
    var v = viewOf(id), el = v && document.getElementById(id);
    if (!el) return true;
    var hb = hdrBottom(), h = id === v ? el.querySelector('.view-title') : el.querySelector('h3');
    var r = (h || el).getBoundingClientRect();
    var ok = r.top >= hb - 1 && r.bottom <= window.innerHeight;
    return id === v ? ok && $('#mem-tools').getBoundingClientRect().top >= hb - 1 : ok;
  }
  // bring the target into view: a group heading goes under the header; a view shows the switch and the
  // view's title, from the page top when they fit there (no jump when they are already on screen)
  function place(id) {
    var v = viewOf(id), el = v && document.getElementById(id);
    if (!el) return false;
    if (id !== v) { el.scrollIntoView({ block: 'start' }); return true; }
    if (inView(id)) return true;
    var title = el.querySelector('.view-title');
    if (title.getBoundingClientRect().bottom + window.scrollY <= window.innerHeight) window.scrollTo(0, 0);
    else $('#mem-tools').scrollIntoView({ block: 'start' });
    return true;
  }

  // mode: 'go' = the visitor followed a link (place the target); 'history' = back/forward or an edited hash
  // (keep the browser's restored scroll unless the target ends up off screen)
  function route(id, mode) {
    var v = viewOf(id);
    if (v) setView(v); else if (!id) setView('members');
    if (!v) return;
    if (mode === 'go') place(id);
    else if (mode === 'history') requestAnimationFrame(function () { if (!inView(id)) place(id); });
  }

  /* ---------- computational / experimental filter (both views) ---------- */
  function applyFilter(f) {
    [].forEach.call(document.querySelectorAll('.card'), function (c) { c.hidden = f !== 'all' && c.getAttribute('data-type') !== f; });
    [].forEach.call(document.querySelectorAll('.grp'), function (g) { g.hidden = !g.querySelector('.card:not([hidden])'); });
    [].forEach.call(document.querySelectorAll('.jump a'), function (a) {
      var g = document.getElementById(a.getAttribute('href').slice(1));
      a.parentNode.hidden = !!(g && g.hidden);
    });
  }
  function initFilter() {
    var btns = [].slice.call(document.querySelectorAll('[data-filter]'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        applyFilter(b.getAttribute('data-filter'));
      });
    });
  }

  function init() {
    if (!D.lab) return;
    var nm = S.countPeople(D.members), na = S.countPeople(D.alumni), pr = D.professor || {};
    $('#people-sub').textContent = nm + ' current members and ' + na + ' alumni of the ' + (D.lab.name || '') + '.';
    if (pr.name) $('#pi-link').innerHTML = 'Principal investigator: <a href="professor.html">Professor ' + esc(pr.name) + '</a>';
    else $('#pi-link').remove();

    var mIds = groupIds(D.members, 'members'), aIds = groupIds(D.alumni, 'alumni');
    $('#members-groups').innerHTML = groupsHtml(D.members, mIds, false);
    $('#alumni-groups').innerHTML = groupsHtml(D.alumni, aIds, true);
    $('#jump-members ul').innerHTML = jumpsHtml(D.members, mIds);
    $('#jump-alumni ul').innerHTML = jumpsHtml(D.alumni, aIds);

    // same-page links into the members/alumni namespace: switch the view, push one history entry, place
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (!viewOf(id)) return;
      e.preventDefault();
      if (hashId() !== id) history.pushState(null, '', '#' + id);
      route(id, 'go');
    });
    // back / forward and hand-edited hashes
    window.addEventListener('popstate', function () { route(hashId(), 'history'); });
    window.addEventListener('hashchange', function () { route(hashId(), 'history'); });

    initFilter();
    route(hashId(), 'load');
    S.initHeader();
    S.initFooter();
    S.settleHash(place);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
