const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем подключение к БД
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Инициализируем таблицы
db.serialize(() => {
  // Таблица пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user'
    )
  `);

  // Таблица анекдотов
  db.run(`CREATE TABLE IF NOT EXISTS anecdotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0
  )`);

  // Таблица лайков 
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    anecdote_id INTEGER,
    user_ip TEXT,
    PRIMARY KEY (anecdote_id, user_ip),
    FOREIGN KEY (anecdote_id) REFERENCES anecdotes(id)
  )`);

  db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
    if (!row) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')",
        ['admin', hashedPassword]
      );
    }
  });

});

module.exports = db;