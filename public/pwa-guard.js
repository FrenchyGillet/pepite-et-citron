/**
 * Installed-PWA guard for the landing page.
 *
 * "/" serves this static marketing page in a normal browser tab. But an
 * already-installed PWA (whose cached manifest still has start_url "/") would
 * also land here on launch. When we detect standalone display mode, bounce
 * straight to the SPA shell so the installed app never shows marketing.
 *
 * Loaded synchronously in <head> (CSP forbids inline scripts), before paint.
 */
(function () {
  try {
    var standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true;
    if (standalone) {
      window.location.replace('/app.html' + window.location.search);
    }
  } catch (e) {
    /* matchMedia unavailable — do nothing, show the landing page */
  }
})();
