document.addEventListener("DOMContentLoaded", async () => {
  // Проверяем авторизацию
  const checkAuth = async () => {
    try {
      const res = await fetch('/check-auth');
      if (res.status === 401) {
        window.location.href = '/register.html';
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

  // Fetch во время загрузки страницы
  fetch("/anecdotes")
    .then(response => response.json())
    .then(data => {
      data.forEach(anecdote => {
        displayAnecdote(anecdote);
      });
    })
    .catch(error => console.error(error));

  // Постинг
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
  
    let timeString = "Неверное время";
    let dateString = "Неверная дата";
  
    if (date) {
      timeString = date.toLocaleTimeString();
      dateString = date.toLocaleDateString();
    }
  
    anecdoteDiv.innerHTML = `
      <div class="anecdote-content">
        <div class="anecdote-text">${anecdote.text}</div>
        <div class="anecdote-time">Posted on ${dateString} at ${timeString}</div>
        <div class="anecdote-actions">
          <button>Братишке отправить</button>
          <button>Нравица</button>
        </div>
      </div>
    `;
  
    feedSection.insertBefore(anecdoteDiv, feedSection.firstChild);
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