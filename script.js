document.addEventListener('DOMContentLoaded', () => {
  const reservationForm = document.getElementById('reservation');
  const subscribeForm = document.getElementById('subscribe-form');
  const availabilityStatus = document.getElementById('availability-status');
  const dateInput = reservationForm ? reservationForm.querySelector('input[name="datetime"]') : null;

  if (reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(reservationForm);
      const name = (formData.get('name') || '').toString().trim();
      const phone = (formData.get('phone') || '').toString().trim();
      const datetime = (formData.get('datetime') || '').toString();
      const covers = parseInt(formData.get('covers') || '1', 10);

      if (!name || !phone || !datetime) {
        showToast('Veuillez remplir tous les champs.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, datetime, covers, dishName: selectedDishInput ? selectedDishInput.value : '' }),
        });
        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || 'Impossible d’enregistrer la réservation.', 'error');
          return;
        }

        showToast(`Réservation confirmée. Table ${result.tableNumber} réservée.`, 'success');
        reservationForm.reset();
        if (availabilityStatus) availabilityStatus.textContent = '';
        setSelectedDish('');
      } catch (error) {
        showToast('Erreur de connexion au serveur.', 'error');
      }
    });
  }

  if (dateInput && availabilityStatus) {
    dateInput.addEventListener('change', async () => {
      const value = dateInput.value;
      if (!value) {
        availabilityStatus.textContent = '';
        return;
      }

      try {
        const response = await fetch(`/api/availability?datetime=${encodeURIComponent(value)}`);
        const data = await response.json();
        if (!response.ok) {
          availabilityStatus.textContent = 'Impossible de vérifier la disponibilité.';
          return;
        }

        availabilityStatus.textContent = data.availableTables > 0
          ? `Tables disponibles : ${data.availableTables}`
          : 'Aucune table disponible à cette heure.';
      } catch {
        availabilityStatus.textContent = 'Impossible de vérifier la disponibilité.';
      }
    });
  }

  const selectedDishInput = document.getElementById('selected-dish');
  const selectedDishLabel = document.getElementById('selected-dish-label');
  const galleryToggle = document.getElementById('gallery-toggle');
  const foodGrid = document.querySelector('.food-grid');

  const setSelectedDish = (dishName) => {
    if (selectedDishInput) selectedDishInput.value = dishName || '';
    if (selectedDishLabel) {
      selectedDishLabel.textContent = dishName
        ? `Plat sélectionné pour réservation : ${dishName}`
        : '';
    }
  };

  if (galleryToggle && foodGrid) {
    galleryToggle.addEventListener('click', (e) => {
      e.preventDefault();
      foodGrid.classList.toggle('collapsed');
      galleryToggle.textContent = foodGrid.classList.contains('collapsed')
        ? 'Voir plus des recettes'
        : 'Masquer';
    });
  }

  document.querySelectorAll('.dish-card[data-dish]').forEach((card) => {
    card.addEventListener('click', () => {
      const dishName = card.dataset.dish;
      setSelectedDish(dishName);
      showToast(`Vous pouvez réserver : ${dishName}`, 'success');
      const reservationSection = document.getElementById('reservation');
      if (reservationSection) {
        reservationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (subscribeForm) {
    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(subscribeForm);
      const email = (formData.get('email') || '').toString().trim();

      if (!email || !email.includes('@')) {
        showToast('Veuillez entrer une adresse email valide.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || 'Impossible de s’abonner.', 'error');
          return;
        }

        showToast(result.message, 'success');
        subscribeForm.reset();
      } catch {
        showToast('Erreur de connexion au serveur.', 'error');
      }
    });
  }

  document.querySelectorAll('.menu-action').forEach((button) => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dishName = button.dataset.dish;
      const details = button.dataset.details;
      const price = button.dataset.price;

      if (!dishName || !details || !price) {
        showToast('Information de plat manquante.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishName, details, price }),
        });
        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || 'Impossible de passer la commande.', 'error');
          return;
        }

        showToast(result.message, 'success');
      } catch {
        showToast('Erreur de connexion au serveur.', 'error');
      }
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && href !== '#' && href.startsWith('#')) {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    rootMargin: '0px 0px -20% 0px',
    threshold: 0.15,
  });

  document.querySelectorAll('.reveal-section').forEach((section) => {
    revealObserver.observe(section);
  });
});

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'card';
  toast.style.position = 'fixed';
  toast.style.right = '1rem';
  toast.style.bottom = '1rem';
  toast.style.zIndex = '9999';
  toast.style.minWidth = '280px';
  toast.style.padding = '0.8rem 1rem';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.justifyContent = 'space-between';
  toast.style.gap = '0.6rem';
  toast.style.boxShadow = '0 16px 35px rgba(0,0,0,0.2)';
  toast.style.background = type === 'error' ? 'rgba(92, 20, 9, 0.96)' : 'rgba(255, 236, 202, 0.96)';
  toast.style.color = type === 'error' ? '#fff' : '#1f0f02';

  const text = document.createElement('div');
  text.textContent = message;
  toast.appendChild(text);

  const btn = document.createElement('button');
  btn.textContent = 'OK';
  btn.style.background = 'transparent';
  btn.style.border = 'none';
  btn.style.color = 'inherit';
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', () => toast.remove());
  toast.appendChild(btn);

  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6000);
}
