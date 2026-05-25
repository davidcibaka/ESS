document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reservation');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const phone = (data.get('phone') || '').toString().trim();
      const datetime = (data.get('datetime') || '').toString();
      const covers = parseInt(data.get('covers') || '1', 10);
      if (!name || !phone || !datetime) {
        showToast("Veuillez remplir tous les champs.", 'error');
        return;
      }
      const reservation = { id: Date.now(), name, phone, datetime, covers };
      const existing = JSON.parse(localStorage.getItem('reservations') || '[]');
      existing.push(reservation);
      localStorage.setItem('reservations', JSON.stringify(existing));
      showToast("Demande envoyée — nous confirmerons par téléphone.", 'success');
      form.reset();
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
});

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'card';
  toast.style.position = 'fixed';
  toast.style.right = '1rem';
  toast.style.bottom = '1rem';
  toast.style.zIndex = '9999';
  toast.style.minWidth = '260px';
  toast.style.padding = '0.6rem 0.9rem';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.justifyContent = 'space-between';
  toast.style.gap = '0.6rem';

  const text = document.createElement('div');
  text.textContent = message;
  toast.appendChild(text);

  const btn = document.createElement('button');
  btn.textContent = 'OK';
  btn.style.background = 'transparent';
  btn.style.border = 'none';
  btn.style.color = 'var(--text)';
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', () => toast.remove());
  toast.appendChild(btn);

  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6000);
}
