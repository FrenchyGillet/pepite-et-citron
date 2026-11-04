/**
 * Language switcher of the static pages (landing, guides, legal pages).
 *
 * The menu is a native <details>, so it works without this script. Here we
 * only add the usual niceties (close on outside click and Escape), and carry
 * the language over to the app, which reads the same "pepite_lang" key:
 *  - picking a language saves it;
 *  - opening the app (/start, /login) from a page saves that page's language,
 *    unless one was already chosen.
 * Nothing redirects by browser language: the visitor stays on the page asked for.
 */
(function () {
  var KEY = 'pepite_lang';
  function save(lang) { try { localStorage.setItem(KEY, lang); } catch (e) { /* storage blocked */ } }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  function closeMenus(except) {
    var open = document.querySelectorAll('details.lang-switch[open]');
    for (var i = 0; i < open.length; i++) if (open[i] !== except) open[i].removeAttribute('open');
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var menu = target.closest ? target.closest('details.lang-switch') : null;
    closeMenus(menu);

    var link = target.closest ? target.closest('a') : null;
    if (!link) return;
    var lang = link.getAttribute('data-lang');
    if (lang) { save(lang); return; }
    var href = link.getAttribute('href') || '';
    if (/^\/(start|login)(\?|$)/.test(href) && !saved()) save(document.documentElement.lang);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelector('details.lang-switch[open]');
    if (!open) return;
    open.removeAttribute('open');
    var summary = open.querySelector('summary');
    if (summary) summary.focus();
  });
})();
