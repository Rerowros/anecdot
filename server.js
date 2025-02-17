
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

// Имитируем БД в памяти
let users = [];

let anecdotes = [];

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// GET anecdotes
app.get("/anecdotes", (req, res) => {
  res.json(anecdotes);
});

// POST анеков
app.post("/anecdotes", (req, res) => {
  const newAnecdote = { 
    text: req.body.text,
    timestamp: new Date() 
  };
  anecdotes.unshift(newAnecdote);
  res.json(newAnecdote);
});

// Маршрут для регистрации
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  // Хэшируем пароль и сохраняем
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.json({ success: true });
});

// Маршрут для входа
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  req.session.user = username;
  res.json({ success: true });
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});