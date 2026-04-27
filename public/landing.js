var isAnnual = true;

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
    cta.textContent   = 'Passer Pro — 12,99 €/an →';
    lAnnual.style.color  = 'var(--label-primary)';
    lMonthly.style.color = 'var(--label-secondary)';
  } else {
    toggle.className  = 'pricing-toggle-switch monthly';
    price.textContent = '2,99 €';
    sub.textContent   = 'par mois';
    cta.textContent   = 'Passer Pro — 2,99 €/mois →';
    lAnnual.style.color  = 'var(--label-secondary)';
    lMonthly.style.color = 'var(--label-primary)';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.getElementById('billing-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', toggleBilling);
  toggle.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleBilling(); }
  });
});
