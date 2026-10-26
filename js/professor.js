/* S6 rail — Professor page: the professor only, and only what the current prof.html shows (user rule 2026-10-26):
   photo, name, position, roles, department, address, email, Google Citation and CV links, then Education,
   Experience and the service lines. All from window.CCEL.professor (education / experience / service). */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;

  function period(p) { return String(p || '').replace(/\s+-\s+/, ' – '); }

  function educationHtml(list) {
    return '<ul class="cv-list">' + list.map(function (e) {
      var deg = [e.degree + (e.honors ? ' (' + e.honors + ')' : ''), e.field].filter(Boolean).join(', ');
      return '<li><span class="org">' + esc(e.institution) + (e.location ? '<span class="loc">, ' + esc(e.location) + '</span>' : '') + '</span>' +
        '<span class="row"><span>' + esc(deg) + '</span><span class="when">' + esc(e.date || '') + '</span></span>' +
        (e.thesis ? '<span class="note">“' + esc(e.thesis) + '”</span>' : '') +
        (e.advisor ? '<span class="note">Advisor: ' + esc(e.advisor) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  // experience by institution, then the service lines (editorial boards, memberships) as on prof.html
  function experienceHtml(list, service) {
    return '<ul class="cv-list">' + list.map(function (x) {
      return '<li><span class="org">' + esc(x.institution) + (x.location ? '<span class="loc">, ' + esc(x.location) + '</span>' : '') + '</span>' +
        (x.roles || []).map(function (r) {
          return '<span class="row"><span>' + esc([r.title, r.unit].filter(Boolean).join(', ')) + '</span><span class="when">' + esc(period(r.period)) + '</span></span>';
        }).join('') + '</li>';
    }).join('') + (service || []).map(function (s) {
      return '<li class="svc"><span class="row"><span><b>' + esc(s.title) + '</b>, ' + esc(s.organization) + '</span><span class="when">' + esc(period(s.period)) + '</span></span></li>';
    }).join('') + '</ul>';
  }

  function textLink(href, key, label) {
    if (!href) return '';
    var url = /^https?:\/\//i.test(href) ? S.https(href) : S.img(href);
    return '<a class="pf-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + S.ICONS[key][1] + '<span>' + esc(label) + '</span></a>';
  }

  function render() {
    var pr = D.professor || {}, c = D.contact || {}, links = pr.links || {};
    var edu = pr.education || [], exp = pr.experience || [], svc = pr.service || [];
    // "Professor, Department of ..., Seoul National University" -> position, then the department on two lines
    var t = String(pr.title || ''), k = t.indexOf(', ');
    var position = k > 0 ? t.slice(0, k) : t, dept = k > 0 ? t.slice(k + 2) : '';
    var j = dept.lastIndexOf(', '), deptLines = j > 0 ? [dept.slice(0, j), dept.slice(j + 2)] : (dept ? [dept] : []);
    // the contact address repeats the department: keep only the street line, as prof.html does
    var addr = String(c.address || '');
    if (dept && addr.indexOf(dept) === 0) addr = addr.slice(dept.length).replace(/^[,\s]+/, '');
    var phd = edu.some(function (e) { return /^Ph\.?\s?D\.?$/i.test(e.degree || ''); });

    var html = '<div class="prof-full">' +
      (pr.photo ? '<img src="' + esc(S.img(pr.photo)) + '" alt="' + esc(pr.name) + '">' : '<span></span>') +
      '<div><h2 id="prof-name">' + esc(pr.name) + (phd ? ', Ph.D.' : '') + '</h2>' +
      '<p class="role">' + esc(position) + '</p>' +
      (pr.roles || []).map(function (r) { return '<p class="role">' + esc(r) + '</p>'; }).join('') +
      '<p class="pf-dept">' + deptLines.map(esc).join('<br>') + '</p>' +
      (addr ? '<p class="pf-addr">' + esc(addr) + '</p>' : '') +
      (pr.email ? '<p class="pf-mail">Contact: <a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a></p>' : '') +
      '<p class="pf-links">' + textLink(links.google_scholar, 'scholar', 'Google Citation') + textLink(links.cv, 'cv', 'Curriculum Vitae') + '</p>' +
      '</div></div>';
    if (edu.length || exp.length || svc.length) {
      html += '<div class="cv-cols">' +
        (edu.length ? '<div><h3>Education</h3>' + educationHtml(edu) + '</div>' : '') +
        (exp.length || svc.length ? '<div><h3>Experience</h3>' + experienceHtml(exp, svc) + '</div>' : '') + '</div>';
    }
    $('#prof').innerHTML = html;
  }

  function init() {
    if (!D.lab) return;
    document.title = 'Professor ' + ((D.professor && D.professor.name) || '') + ' — ' + (D.lab.short || '');
    render();
    S.initHeader();
    S.initFooter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
