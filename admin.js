document.addEventListener('DOMContentLoaded', async () => {
    // Проверка прав администратора
    try {
        const response = await fetch('/user-role');
        const data = await response.json();
        
        if (data.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    } catch (err) {
        console.error(err);
        window.location.href = 'index.html';
        return;
    }

    // Обработчик публикации анекдота
    document.getElementById('postButton').addEventListener('click', async () => {
        const text = document.getElementById('anecdoteText').value;
        if (!text) {
            alert('Введите текст анекдота');
            return;
        }

        try {
            const response = await fetch('/anecdotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                alert('Анекдот успешно опубликован');
                document.getElementById('anecdoteText').value = '';
            } else {
                alert('Ошибка при публикации анекдота');
            }
        } catch (err) {
            console.error(err);
            alert('Ошибка при отправке запроса');
        }
    });

    // Обработчик изменения пароля
    document.getElementById('changePasswordBtn').addEventListener('click', async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
    
        if (!currentPassword || !newPassword) {
            alert('Заполните все поля');
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
            console.error('Ошибка:', err);
            alert('Ошибка при отправке запроса. Проверьте консоль для деталей.');
        }
    });


    async function loadAnecdotes() {
        try {
            const response = await fetch('/anecdotes');
            const anecdotes = await response.json();
            
            const anecdotesList = document.getElementById('anecdotesList');
            anecdotesList.innerHTML = '';
            
            anecdotes.forEach(anecdote => {
                const row = document.createElement('div');
                row.className = 'anecdote-row';
                row.innerHTML = `
                    <span>${anecdote.id}</span>
                    <span>${anecdote.text.substring(0, 100)}${anecdote.text.length > 100 ? '...' : ''}</span>
                    <span>${new Date(anecdote.timestamp).toLocaleString()}</span>
                    <span>${anecdote.likes}</span>
                    <span>
                        <button class="delete-anecdote" data-id="${anecdote.id}">Удалить</button>
                    </span>
                `;
                anecdotesList.appendChild(row);
            });
    
            // Добавляем обработчики для кнопок удаления
            document.querySelectorAll('.delete-anecdote').forEach(button => {
                button.addEventListener('click', async (e) => {
                    if (confirm('Вы уверены, что хотите удалить этот анекдот?')) {
                        const id = e.target.dataset.id;
                        try {
                            const response = await fetch(`/anecdotes/${id}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                loadAnecdotes(); // Перезагружаем список
                            } else {
                                alert('Ошибка при удалении анекдота');
                            }
                        } catch (err) {
                            console.error(err);
                            alert('Ошибка при отправке запроса');
                        }
                    }
                });
            });
        } catch (err) {
            console.error(err);
            alert('Ошибка при загрузке анекдотов');
        }
    }
    
    // Загружаем анекдоты при загрузке страницы
    loadAnecdotes();
    
});
