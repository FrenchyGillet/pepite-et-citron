var isAnnual = true;

// Umami may be blocked (ad blocker) or not loaded yet: never let it break the page.
function track(event, data) {
  try { if (window.umami) window.umami.track(event, data); } catch (e) { /* ignore */ }
}

function toggleBilling() {
  isAnnual = !isAnnual;
  var toggle  = document.getElementById('billing-toggle');
  var price   = document.getElementById('price-display');
  var sub     = document.getElementById('price-sub');
  var cta     = document.getElementById('pro-cta');
  var lAnnual = document.getElementById('label-annual');
  var lMonthly= document.getElementById('label-monthly');
  if (isAnnual) {
    toggle.className  = 'pricing-toggle-switch annual';
    price.textContent = '12,99 €';
    sub.textContent   = 'par an · soit 1,08 €/mois';
    cta.textContent   = 'Passer Pro : 12,99 €/an →';
    cta.href          = '/start?plan=annual';
    lAnnual.style.color  = 'var(--label-primary)';
    lMonthly.style.color = 'var(--label-secondary)';
  } else {
    toggle.className  = 'pricing-toggle-switch monthly';
    price.textContent = '2,99 €';
    sub.textContent   = 'par mois';
    cta.textContent   = 'Passer Pro : 2,99 €/mois →';
    cta.href          = '/start?plan=monthly';
    lAnnual.style.color  = 'var(--label-secondary)';
    lMonthly.style.color = 'var(--label-primary)';
  }
  var plan = isAnnual ? 'annual' : 'monthly';
  toggle.setAttribute('aria-checked', String(isAnnual));
  cta.setAttribute('data-umami-event-plan', plan);
  track('landing_billing_toggled', { plan: plan });
}

document.addEventListener('DOMContentLoaded', function() {
  // Billing toggle
  var toggle = document.getElementById('billing-toggle');
  if (toggle) {
    toggle.addEventListener('click', toggleBilling);
    toggle.addEventListener('keydown', function(e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleBilling(); }
    });
  }

  // Scroll depth: which sections visitors actually reach (once per page view)
  if ('IntersectionObserver' in window) {
    var sections = [
      ['.features', 'features'],
      ['.story-section', 'story'],
      ['#comment-ca-marche', 'how'],
      ['#occasions', 'occasions'],
      ['#tarifs', 'pricing'],
      ['#installer', 'install'],
      ['footer', 'footer'],
    ];
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        track('landing_section_viewed', { section: entry.target.getAttribute('data-section') });
      });
    }, { threshold: 0.3 });
    sections.forEach(function(s) {
      var el = document.querySelector(s[0]);
      if (!el) return;
      el.setAttribute('data-section', s[1]);
      observer.observe(el);
    });
  }

  // Analytics notice
  var notice  = document.getElementById('analytics-notice');
  var dismiss = document.getElementById('analytics-dismiss');
  if (notice && !localStorage.getItem('analytics_notice_dismissed')) {
    notice.style.display = 'flex';
    if (dismiss) {
      dismiss.addEventListener('click', function() {
        localStorage.setItem('analytics_notice_dismissed', '1');
        notice.style.display = 'none';
      });
    }
  }
});
