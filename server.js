const db = require('./db');

const session = require("express-session");
const bcrypt = require("bcrypt");

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Имитируем базу пользователей в памяти
let users = [];

let anecdotes = [];

// Middleware to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress;
};

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// GET anecdotes
app.get("/anecdotes", (req, res) => {
  db.all("SELECT * FROM anecdotes ORDER BY timestamp DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST new anecdote
app.post("/anecdotes", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.get(
    "SELECT role FROM users WHERE username = ?",
    [req.session.user],
    (err, user) => {
      if (err || user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { text } = req.body;
      db.run(
        "INSERT INTO anecdotes (text, likes) VALUES (?, 0)",
        [text],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          // Получаем созданный анекдот
          db.get(
            "SELECT * FROM anecdotes WHERE id = ?",
            [this.lastID],
            (err, row) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json(row);
            }
          );
        }
      );
    }
  );
});

// Like/unlike anecdote
app.post("/anecdotes/:id/like", (req, res) => {
  const anecdoteId = parseInt(req.params.id);
  const clientIP = getClientIP(req);

  db.get(
    "SELECT * FROM likes WHERE anecdote_id = ? AND user_ip = ?",
    [anecdoteId, clientIP],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row) {
        // Убираем лайк
        db.run(
          "DELETE FROM likes WHERE anecdote_id = ? AND user_ip = ?",
          [anecdoteId, clientIP]
        );
        db.run(
          "UPDATE anecdotes SET likes = likes - 1 WHERE id = ?",
          [anecdoteId]
        );
      } else {
        // Добавляем лайк
        db.run(
          "INSERT INTO likes (anecdote_id, user_ip) VALUES (?, ?)",
          [anecdoteId, clientIP]
        );
        db.run(
          "UPDATE anecdotes SET likes = likes + 1 WHERE id = ?",
          [anecdoteId]
        );
      }

      // Возвращаем обновленное количество лайков
      db.get(
        "SELECT likes FROM anecdotes WHERE id = ?",
        [anecdoteId],
        (err, row) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ likes: row.likes });
        }
      );
    }
  );
});

// Маршрут для регистрации
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      (err) => {
        if (err) {
          return res.status(400).json({ error: "Username already exists" });
        }
        res.json({ success: true });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Маршрут для входа
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.user = username;
      res.json({ success: true });
    }
  );
});

// Проверка авторизации
app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    res.status(200).send("Authorized");
  } else {
    res.status(401).send("Unauthorized");
  }
});

// Маршрут для выхода
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Новый маршрут для проверки роли пользователя
app.get("/user-role", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.get(
    "SELECT role FROM users WHERE username = ?",
    [req.session.user],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ role: user.role });
    }
  );
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});