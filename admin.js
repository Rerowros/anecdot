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
});