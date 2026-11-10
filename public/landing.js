var isAnnual = true;

// Umami may be blocked (ad blocker) or not loaded yet: never let it break the page.
function track(event, data) {
  try { if (window.umami) window.umami.track(event, data); } catch (e) { /* ignore */ }
}

// The page carries its own wording (FR, EN, NL): data-annual / data-monthly.
function showPlan(el, plan) {
  var text = el && el.getAttribute('data-' + plan);
  if (text) el.textContent = text;
}

function toggleBilling() {
  isAnnual = !isAnnual;
  var plan    = isAnnual ? 'annual' : 'monthly';
  var toggle  = document.getElementById('billing-toggle');
  var cta     = document.getElementById('pro-cta');
  var lAnnual = document.getElementById('label-annual');
  var lMonthly= document.getElementById('label-monthly');
  toggle.className = 'pricing-toggle-switch ' + plan;
  showPlan(document.getElementById('price-display'), plan);
  showPlan(document.getElementById('price-sub'), plan);
  showPlan(cta, plan);
  cta.href = '/start?plan=' + plan;
  lAnnual.style.color  = isAnnual ? 'var(--label-primary)' : 'var(--label-secondary)';
  lMonthly.style.color = isAnnual ? 'var(--label-secondary)' : 'var(--label-primary)';
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

  // Scroll depth: which sections visitors actually reach (once per page view).
  // Sections are tagged data-section="…" in the HTML, same names in every language.
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        track('landing_section_viewed', { section: entry.target.getAttribute('data-section') });
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('[data-section]').forEach(function(el) { observer.observe(el); });
  }

  // Analytics notice
  var notice  = document.getElementById('analytics-notice');
  var dismiss = document.getElementById('analytics-dismiss');
  var dismissed = false;
  try { dismissed = !!localStorage.getItem('analytics_notice_dismissed'); } catch (e) { /* storage blocked */ }
  if (notice && !dismissed) {
    notice.style.display = 'flex';
    if (dismiss) {
      dismiss.addEventListener('click', function() {
        try { localStorage.setItem('analytics_notice_dismissed', '1'); } catch (e) { /* storage blocked */ }
        notice.style.display = 'none';
      });
    }
  }
});
