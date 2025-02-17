// Front-end logic to fetch and post anecdotes

document.addEventListener("DOMContentLoaded", async () => {
  // Добавить в начало DOMContentLoaded обработчика

  let isAdmin = false;

  // Проверяем роль пользователя
  const checkRole = async () => {
    try {
      const res = await fetch('/user-role');
      const data = await res.json();
      isAdmin = data.role === 'admin';
      
      const postButton = document.getElementById("postButton");
      const anecdoteText = document.getElementById("anecdoteText");
      
      if (!isAdmin) {
        postButton.disabled = true;
        anecdoteText.disabled = true;
        postButton.style.opacity = "0.5";
        anecdoteText.style.opacity = "0.5";
        
        const newAnecdoteSection = document.getElementById("new-anecdote");
        const message = document.createElement("div");
        message.textContent = "Только администраторы могут публиковать анекдоты";
        message.style.color = "#ff9800";
        message.style.marginTop = "10px";
        newAnecdoteSection.appendChild(message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  await checkRole();

  // Проверяем авторизацию
  const checkAuth = async () => {
    try {
      const res = await fetch('/check-auth');
      if (res.status === 401) {
        window.location.href = '/login.html';
      }
    } catch (err) {
      console.error(err);
      window.location.href = '/login.html';
    }
  };

  await checkAuth();

  const postButton = document.getElementById("postButton");
  const feedSection = document.getElementById("feed");
  const anecdoteText = document.getElementById("anecdoteText");

  // Fetch anecdotes on page load
  fetch("/anecdotes")
    .then(response => response.json())
    .then(data => {
      data.forEach(anecdote => {
        displayAnecdote(anecdote);
      });
    })
    .catch(error => console.error(error));

  // Post new anecdote
  postButton.addEventListener("click", () => {
    const text = anecdoteText.value.trim();
    if (!text) return;

    fetch("/anecdotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })
      .then(response => response.json())
      .then(createdAnecdote => {
        displayAnecdote(createdAnecdote);
        anecdoteText.value = "";
      })
      .catch(error => console.error(error));
  });

  function displayAnecdote(anecdote) {
    const anecdoteDiv = document.createElement("div");
    anecdoteDiv.classList.add("anecdote");
  
    let date;
    try {
      date = new Date(anecdote.timestamp); // Try direct parsing
      if (isNaN(date.getTime())) {
        // If direct parsing fails, try Date.parse
        date = new Date(Date.parse(anecdote.timestamp));
      }
    } catch (e) {
      console.error("Error parsing date:", anecdote.timestamp, e);
      date = null; // Or a default date, or handle the error as needed
    }
  
    let timeString = "Invalid Date";
    let dateString = "Invalid Date";
  
    if (date) {
      timeString = date.toLocaleTimeString();
      dateString = date.toLocaleDateString();
    }
  
    // Check if the anecdote is liked by the user
    let liked = localStorage.getItem(`liked-${anecdote.id}`) === 'true';
    const likeButtonClass = liked ? 'liked' : '';
  
    anecdoteDiv.innerHTML = `
      <div class="anecdote-content">
        <div class="anecdote-text">${anecdote.text}</div>
        <div class="anecdote-time">Выложено ${dateString} в ${timeString}</div>
        <div class="anecdote-actions">
          <button>Переслать</button>
          <button class="like-button ${likeButtonClass}" data-id="${anecdote.id}">
            <span class="heart ${likeButtonClass}">❤️</span>
            <span class="likes-count">${anecdote.likes}</span>
          </button>
        </div>
      </div>
    `;
  
    feedSection.insertBefore(anecdoteDiv, feedSection.firstChild);
  
    // Add event listener to like button
    const likeButton = anecdoteDiv.querySelector('.like-button');
    likeButton.addEventListener('click', async () => {
      const anecdoteId = likeButton.dataset.id;
      try {
        const res = await fetch(`/anecdotes/${anecdoteId}/like`, {
          method: 'POST'
        });
        const data = await res.json();
        const likesCountSpan = likeButton.querySelector('.likes-count');
        likesCountSpan.textContent = data.likes;
  
        liked = !liked;
        localStorage.setItem(`liked-${anecdoteId}`, liked);
        likeButton.classList.toggle('liked', liked);
        likeButton.querySelector('.heart').classList.toggle('liked', liked);
  
      } catch (err) {
        console.error(err);
      }
    });
  }

  document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        const res = await fetch('/logout', {
            method: 'POST'
        });
        if (res.ok) {
            window.location.href = '/login.html';
        }
    } catch (err) {
        console.error(err);
    }
  });
});

const bcrypt = require('bcrypt');

async function createAdminUser() {
  const adminUsername = 'admin';
  const adminPassword = 'admin123'; // Измените на более безопасный пароль
  
  try {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    db.run(
      "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
      [adminUsername, hashedPassword, 'admin'],
      (err) => {
        if (err) {
          console.error('Ошибка при создании админа:', err);
        } else {
          console.log('Администратор успешно создан');
        }
      }
    );
  } catch (err) {
    console.error('Ошибка при хешировании пароля:', err);
  }
}

// Вызываем функцию после инициализации базы данных
createAdminUser();

// Добавьте после проверки роли пользователя
if (isAdmin) {
  document.getElementById('change-password-form').style.display = 'block';
  
  document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    
    if (!currentPassword || !newPassword) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      const response = await fetch('/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Пароль успешно изменен');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
      } else {
        alert(data.error || 'Ошибка при изменении пароля');
      }
    } catch (err) {
      alert('Ошибка при отправке запроса');
      console.error(err);
    }
  });
}