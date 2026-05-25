document.addEventListener('DOMContentLoaded', () => {
  const summary = document.getElementById('admin-summary');
  const ordersList = document.getElementById('orders-list');

  async function loadAdminData() {
    try {
      const response = await fetch('/api/admin/summary');
      const data = await response.json();
      if (!response.ok) {
        summary.textContent = data.error || 'Impossible de charger les données.';
        return;
      }

      summary.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">
          <div class="card" style="padding:1rem;">
            <strong>Abonnés</strong>
            <p>${data.totalSubscribers}</p>
          </div>
          <div class="card" style="padding:1rem;">
            <strong>Réservations</strong>
            <p>${data.totalReservations}</p>
          </div>
          <div class="card" style="padding:1rem;">
            <strong>Commandes en attente</strong>
            <p>${data.pendingOrders}</p>
          </div>
        </div>
      `;

      if (!data.kitchenOrders.length) {
        ordersList.innerHTML = '<p class="subtitle">Aucune commande en cuisine pour le moment.</p>';
        return;
      }

      ordersList.innerHTML = data.kitchenOrders
        .map((order) => `
          <article class="dish-card" style="display:grid; gap:0.8rem;">
            <div>
              <h4 class="dish-name">${order.dish_name}</h4>
              <p class="subtitle">${order.details}</p>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
              <span class="dish-price">${order.price}€</span>
              <span class="subtitle">${new Date(order.created_at).toLocaleString('fr-FR')}</span>
            </div>
          </article>
        `)
        .join('');
    } catch (error) {
      summary.textContent = 'Erreur de connexion au serveur.';
    }
  }

  loadAdminData();
});
