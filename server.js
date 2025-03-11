const db = require('./db');
const https = require('https');
const fs = require('fs');
const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Настройка HTTPS с взаимной TLS-аутентификацией
const httpsOptions = {
  key: fs.readFileSync('/root/cert/rerowros.ddns.net/privkey.pem'),     // Путь к вашему приватному ключу
  cert: fs.readFileSync('/root/cert/rerowros.ddns.net/fullchain.pem'),  // Путь к вашему сертификату
  ca: fs.readFileSync('/root/CA/ca.crt'),                               // Сертификат центра сертификации
  requestCert: true,                                                    // Запрашивать сертификат у клиента
  rejectUnauthorized: true,                                             // Отклонять неавторизованные подключения
  crl: fs.readFileSync('/root/CA/ca.crl')                               // Путь к вашему списку отозванных сертификатов
};


// Middleware для проверки TLS-сертификата клиента
const checkClientCert = (req, res, next) => {
  // Проверяем наличие клиентского сертификата
  if (!req.client.authorized) {
    return res.status(401).json({ error: 'Доступ запрещен: неверный клиентский сертификат' });
  }
  
  // Получаем информацию о сертификате
  const cert = req.socket.getPeerCertificate();
  
  if (!cert || !cert.subject) {
    return res.status(401).json({ error: 'Клиентский сертификат не содержит необходимой информации' });
  }
  
  // Извлекаем идентификатор пользователя из сертификата (например, Common Name)
  const username = cert.subject.CN;
  
 
};

// Применяем middleware проверки mTLS ко ВСЕМ маршрутам без исключений
app.use((req, res, next) => {
  checkClientCert(req, res, next);
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Имитируем базу пользователей в памяти
let users = [];

let anecdotes = [];

// Middleware to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress;
};

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
  // mTLS уже проверил пользователя, но мы все еще проверяем роль
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

// Обновленный маршрут для лайков
app.post("/anecdotes/:id/like", async (req, res) => {
  // mTLS уже установил пользователя в сессию

  const anecdoteId = parseInt(req.params.id);

  try {
    // Получаем ID пользователя
    db.get(
      "SELECT id FROM users WHERE username = ?",
      [req.session.user],
      (err, user) => {
        if (err || !user) {
          return res.status(400).json({ error: "User not found" });
        }

        // Проверяем, есть ли уже лайк
        db.get(
          "SELECT * FROM likes WHERE anecdote_id = ? AND user_id = ?",
          [anecdoteId, user.id],
          (err, like) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (like) {
              // Удаляем лайк
              db.run(
                "DELETE FROM likes WHERE anecdote_id = ? AND user_id = ?",
                [anecdoteId, user.id],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }
                  updateLikesCount(anecdoteId, res);
                }
              );
            } else {
              // Добавляем лайк
              db.run(
                "INSERT INTO likes (anecdote_id, user_id) VALUES (?, ?)",
                [anecdoteId, user.id],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }
                  updateLikesCount(anecdoteId, res);
                }
              );
            }
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Вспомогательная функция для обновления количества лайков
function updateLikesCount(anecdoteId, res) {
  db.get(
    "SELECT COUNT(*) as likes FROM likes WHERE anecdote_id = ?",
    [anecdoteId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Обновляем количество лайков в таблице анекдотов
      db.run(
        "UPDATE anecdotes SET likes = ? WHERE id = ?",
        [row.likes, anecdoteId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ likes: row.likes });
        }
      );
    }
  );
}

// Добавляем новый endpoint для проверки лайка
app.get("/anecdotes/:id/liked", (req, res) => {
  // Проверка уже выполнена через mTLS

  const anecdoteId = parseInt(req.params.id);

  db.get(
    `SELECT l.* FROM likes l
     JOIN users u ON l.user_id = u.id
     WHERE u.username = ? AND l.anecdote_id = ?`,
    [req.session.user, anecdoteId],
    (err, like) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ liked: !!like });
    }
  );
});

// Маршрут для регистрации (теперь требует сертификат)
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

// Маршрут для входа (теперь требует сертификат)
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  db.get(
    "SELECT password, role FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = username;
        req.session.role = user.role;
        res.json({ 
          username,
          role: user.role 
        });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    }
  );
});

// Проверка авторизации (теперь требует сертификат)
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

// Маршрут для проверки роли пользователя
app.get("/user-role", (req, res) => {
  // mTLS уже установил пользователя в сессию
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

// Маршрут для смены пароля
app.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // mTLS уже установил пользователя в сессию

});

app.delete("/anecdotes/:id", (req, res) => {
  // mTLS уже установил пользователя в сессию

  // Проверяем роль пользователя
  db.get(
      "SELECT role FROM users WHERE username = ?",
      [req.session.user],
      (err, user) => {
          if (err || user.role !== 'admin') {
              return res.status(403).json({ error: "Forbidden" });
          }

          const anecdoteId = parseInt(req.params.id);
          
          // Удаляем сначала все лайки этого анекдота
          db.run("DELETE FROM likes WHERE anecdote_id = ?", [anecdoteId], (err) => {
              if (err) {
                  return res.status(500).json({ error: err.message });
              }
              
              // Затем удаляем сам анекдот
              db.run("DELETE FROM anecdotes WHERE id = ?", [anecdoteId], (err) => {
                  if (err) {
                      return res.status(500).json({ error: err.message });
                  }
                  res.json({ success: true });
              });
          });
      }
  );
});

// Создаем HTTPS-сервер на порту 3000 (заменяем 443 на 3000)
const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(3000, () => {
  console.log('HTTPS сервер запущен на порту 3000');
});