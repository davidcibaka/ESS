const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.resolve(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

const MAX_TABLES = 10;
const RESERVATION_DURATION_MS = 1000 * 60 * 60 * 2;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function overlaps(startMs, endMs, otherStartMs) {
  const otherEndMs = otherStartMs + RESERVATION_DURATION_MS;
  return startMs < otherEndMs && otherStartMs < endMs;
}

function ensureTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      datetime TEXT NOT NULL,
      covers INTEGER NOT NULL,
      table_number INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kitchen_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_name TEXT NOT NULL,
      details TEXT NOT NULL,
      price TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL
    )`);
  });
}

app.get('/api/availability', (req, res) => {
  const datetime = req.query.datetime;
  const startMs = parseDate(datetime);
  if (!startMs) {
    return res.status(400).json({ error: 'Date invalide.' });
  }

  const endMs = startMs + RESERVATION_DURATION_MS;
  const windowStart = new Date(startMs - RESERVATION_DURATION_MS).toISOString();
  const windowEnd = new Date(endMs + RESERVATION_DURATION_MS).toISOString();

  db.all(
    'SELECT * FROM reservations WHERE datetime BETWEEN ? AND ?',
    [windowStart, windowEnd],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur en base de données.' });
      }

      const overlapping = rows.filter((row) => {
        const rowStartMs = parseDate(row.datetime);
        return overlaps(startMs, endMs, rowStartMs);
      });

      const availableTables = Math.max(0, MAX_TABLES - overlapping.length);
      res.json({ availableTables });
    }
  );
});

app.post('/api/reservations', (req, res) => {
  const { name, phone, datetime, covers } = req.body;
  const startMs = parseDate(datetime);
  const coversCount = Number(covers) || 1;

  if (!name || !phone || !datetime || !startMs || coversCount < 1) {
    return res.status(400).json({ error: 'Données de réservation invalides.' });
  }

  const endMs = startMs + RESERVATION_DURATION_MS;
  const windowStart = new Date(startMs - RESERVATION_DURATION_MS).toISOString();
  const windowEnd = new Date(endMs + RESERVATION_DURATION_MS).toISOString();

  db.all(
    'SELECT * FROM reservations WHERE datetime BETWEEN ? AND ?',
    [windowStart, windowEnd],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur en base de données.' });
      }

      const overlapping = rows.filter((row) => {
        const rowStartMs = parseDate(row.datetime);
        return overlaps(startMs, endMs, rowStartMs);
      });

      if (overlapping.length >= MAX_TABLES) {
        return res.status(409).json({ error: 'Aucune table disponible à cette heure.' });
      }

      const usedTables = overlapping.map((row) => row.table_number);
      const tableNumber = Array.from({ length: MAX_TABLES }, (_, index) => index + 1).find(
        (table) => !usedTables.includes(table)
      );

      const createdAt = new Date().toISOString();
      db.run(
        'INSERT INTO reservations (name, phone, datetime, covers, table_number, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [name, phone, new Date(startMs).toISOString(), coversCount, tableNumber, createdAt],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: 'Impossible de créer la réservation.' });
          }

          return res.json({ id: this.lastID, tableNumber, message: 'Réservation confirmée.' });
        }
      );
    }
  );
});

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide.' });
  }

  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO subscribers (email, created_at) VALUES (?, ?)',
    [email.toLowerCase().trim(), createdAt],
    function (err) {
      if (err) {
        return res.status(409).json({ error: 'Cet email est déjà abonné.' });
      }
      res.json({ message: 'Merci pour votre abonnement !' });
    }
  );
});

app.post('/api/orders', (req, res) => {
  const { dishName, details, price } = req.body;
  if (!dishName || !details || !price) {
    return res.status(400).json({ error: 'Données de commande incomplètes.' });
  }

  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO kitchen_orders (dish_name, details, price, created_at, status) VALUES (?, ?, ?, ?, ?)',
    [dishName, details, price.toString(), createdAt, 'pending'],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Impossible de créer la commande.' });
      }
      res.json({ id: this.lastID, message: 'La cuisine a bien reçu la commande.' });
    }
  );
});

app.get('/api/admin/summary', (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) AS totalSubscribers FROM subscribers', (err1, subs) => {
      if (err1) return res.status(500).json({ error: 'Erreur en base.' });

      db.get('SELECT COUNT(*) AS totalReservations FROM reservations', (err2, resCount) => {
        if (err2) return res.status(500).json({ error: 'Erreur en base.' });

        db.get('SELECT COUNT(*) AS pendingOrders FROM kitchen_orders WHERE status = ?', ['pending'], (err3, ordersCount) => {
          if (err3) return res.status(500).json({ error: 'Erreur en base.' });

          db.all(
            'SELECT id, dish_name, details, price, created_at, status FROM kitchen_orders ORDER BY created_at DESC LIMIT 10',
            (err4, orders) => {
              if (err4) return res.status(500).json({ error: 'Erreur en base.' });

              res.json({
                totalSubscribers: subs.totalSubscribers,
                totalReservations: resCount.totalReservations,
                pendingOrders: ordersCount.pendingOrders,
                kitchenOrders: orders,
              });
            }
          );
        });
      });
    });
  });
});

ensureTables();

app.listen(port, () => {
  console.log(`Serveur ESS démarré sur http://localhost:${port}`);
});
