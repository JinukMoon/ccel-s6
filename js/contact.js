/* S6 rail — Contact page, like the current contact_us.html: group photo, lab name, address, email, offices.
   Everything from window.CCEL.contact; no map or form. */
(function () {
  'use strict';
  var S = window.S6, D = S.D, esc = S.esc, $ = S.$;

  function init() {
    if (!D.lab) return;
    var c = D.contact || {};
    document.title = 'Contact — ' + (D.lab.short || '');
    var name = c.lab_name || D.lab.name || '';
    $('#ct-name').textContent = name;
    if (c.group_photo) {
      $('#ct-photo').innerHTML = '<div class="ph"><img src="' + esc(S.img(c.group_photo)) + '" alt="' + esc((D.lab.short || '') + ' group photo') + '" decoding="async"></div>';
    } else $('#ct-photo').remove();
    var rows = [['Address', esc(c.address || '')],
      ['Email', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : ''],
      ['Professor office', esc(c.professor_office || '')],
      ['Laboratory', esc(c.laboratory || '')],
      ['Student office', esc(c.student_office || '')]];
    $('#ct-dl').innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
    }).join('');
    S.initHeader();
    S.initFooter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
