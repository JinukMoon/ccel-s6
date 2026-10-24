/* S6 rail — People page: professor, current members and alumni, all from window.CCEL (English only). */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;

  var MONTH = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(19|20)\\d{2}';
  var RANGE = new RegExp('^(' + MONTH + '|(19|20)\\d{2})\\s*[\\u2013-]\\s*(current|present|' + MONTH + '|(19|20)\\d{2})$', 'i');
  var DATE = new RegExp('^' + MONTH + '$', 'i');

  // professor.sections["Experience"] is a line list: heading (institution), then role + date line pairs.
  // Roles with a date range are positions; roles with a single date are degrees (thesis/advisor lines follow them).
  function parseCv(lines) {
    var edu = [], exp = [], heading = '', last = null, afterDegreeDate = false;
    for (var i = 0; i < lines.length; i++) {
      var l = String(lines[i] || '').replace(/\s+,/g, ',').trim(), next = String(lines[i + 1] || '').trim();
      if (!l || /^(Education|Experience)$/i.test(l)) continue;
      if (RANGE.test(l) || DATE.test(l)) { afterDegreeDate = DATE.test(l); continue; }
      if (RANGE.test(next) || DATE.test(next)) {
        last = { org: heading, title: l, when: next.replace(/\s*-\s*/, ' – '), notes: [] };
        (RANGE.test(next) ? exp : edu).push(last);
        continue;
      }
      if (/^Advisor:/i.test(l) || afterDegreeDate) {
        if (last) last.notes.push(l);
        afterDegreeDate = false;
        continue;
      }
      heading = l;
    }
    return { edu: edu, exp: exp };
  }

  function cvList(items, grouped) {
    if (!grouped) {
      return '<ul class="cv-list">' + items.map(function (it) {
        return '<li><span class="org">' + esc(it.org) + '</span><span class="row"><span>' + esc(it.title) + '</span><span class="when">' + esc(it.when) + '</span></span>' +
          it.notes.map(function (n) { return '<span class="note">' + esc(n) + '</span>'; }).join('') + '</li>';
      }).join('') + '</ul>';
    }
    var groups = [];
    items.forEach(function (it) {
      var g = groups.length && groups[groups.length - 1].org === it.org ? groups[groups.length - 1] : null;
      if (!g) { g = { org: it.org, rows: [] }; groups.push(g); }
      g.rows.push(it);
    });
    return '<ul class="cv-list">' + groups.map(function (g) {
      return '<li><span class="org">' + esc(g.org) + '</span>' + g.rows.map(function (it) {
        return '<span class="row"><span>' + esc(it.title) + '</span><span class="when">' + esc(it.when) + '</span></span>';
      }).join('') + '</li>';
    }).join('') + '</ul>';
  }

  function renderProfessor() {
    var pr = D.professor || {}, c = D.contact || {};
    var cv = parseCv((pr.sections && pr.sections.Experience) || []);
    var html = '<div class="prof-full">' +
      (pr.photo ? '<img src="' + esc(S.img(pr.photo)) + '" alt="' + esc(pr.name) + '">' : '<span></span>') +
      '<div><p class="small">Principal investigator</p><h2>' + esc(pr.name) + '</h2>' +
      '<p class="role">' + esc(pr.title || '') + '</p>' +
      (pr.roles || []).map(function (r) { return '<p class="role">' + esc(r) + '</p>'; }).join('') +
      '<p style="margin-top:12px">' + (pr.email ? '<a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a>' : '') +
      (c.professor_office ? ' <span class="small">· Office: ' + esc(c.professor_office) + '</span>' : '') + '</p>' +
      '<p style="margin-top:6px">' + S.profLinks(pr) + '</p>';
    if (cv.edu.length || cv.exp.length) {
      html += '<div class="cv-cols">' +
        (cv.edu.length ? '<div><h3>Education</h3>' + cvList(cv.edu, false) + '</div>' : '') +
        (cv.exp.length ? '<div><h3>Positions and service</h3>' + cvList(cv.exp, true) + '</div>' : '') + '</div>';
    }
    html += '</div></div>';
    $('#prof').innerHTML = html;
  }

  function card(p, alumni) {
    var nm = S.splitName(p.name);
    var ty = p.type === 'computational' || p.type === 'experimental'
      ? '<span class="ty"><span class="dot ' + p.type.charAt(0) + '" aria-hidden="true"></span>' + (p.type === 'computational' ? 'Computational' : 'Experimental') + '</span>' : '';
    var pos = alumni && p.current_position && p.current_position !== 'N/A' ? '<p class="pos">' + esc(p.current_position) + '</p>' : '';
    var ra = !alumni && p.research_area ? '<p class="ra">' + esc(p.research_area) + '</p>' : '';
    var deg = (p.degrees || []).length ? '<details><summary>Education</summary><ul>' + p.degrees.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></details>' : '';
    var mail = !alumni && p.email ? '<p class="contact"><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></p>' : '';
    return '<li class="card" data-type="' + esc(p.type || '') + '">' +
      '<div class="ph">' + (p.photo ? '<img loading="lazy" decoding="async" src="' + esc(S.img(p.photo)) + '" alt="' + esc(nm.name) + '">' : '') + '</div>' +
      '<div><p class="nm">' + esc(nm.name) + '</p>' + (nm.note ? '<span class="note">' + esc(nm.note) + '</span>' : '') +
      ty + pos + ra + mail + S.linksHtml(nm.name, p.links) + deg + '</div></li>';
  }

  function groupsHtml(groups, alumni, prefix) {
    return (groups || []).map(function (g, i) {
      return '<div class="grp" id="' + prefix + '-' + i + '"><h3>' + esc(g.group) + ' <span>' + g.people.length + '</span></h3>' +
        '<ul class="cards">' + g.people.map(function (p) { return card(p, alumni); }).join('') + '</ul></div>';
    }).join('');
  }

  function initFilter() {
    var btns = [].slice.call(document.querySelectorAll('[data-filter]'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        document.querySelectorAll('.card').forEach(function (c) { c.hidden = f !== 'all' && c.getAttribute('data-type') !== f; });
        document.querySelectorAll('.grp').forEach(function (g) { g.hidden = !g.querySelector('.card:not([hidden])'); });
      });
    });
  }

  function init() {
    if (!D.lab) return;
    document.title = 'People — ' + (D.lab.short || '');
    var nm = S.countPeople(D.members), na = S.countPeople(D.alumni);
    $('#people-sub').textContent = nm + ' current members and ' + na + ' alumni of the ' + (D.lab.name || '') + '.';
    renderProfessor();
    $('#members-groups').innerHTML = groupsHtml(D.members, false, 'm');
    $('#alumni-groups').innerHTML = groupsHtml(D.alumni, true, 'a');
    initFilter();
    S.initHeader();
    S.initFooter();
    S.settleHash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
