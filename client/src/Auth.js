import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Auth({ isLoginMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const payload = isLoginMode ? { email, password } : { username, email, password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLoginMode) {
          localStorage.setItem('token', data.token);
          navigate('/');
        } else {
          alert('Регистрация успешна! Теперь войдите.');
          navigate('/login');
        }
      } else {
        alert(data.error || 'Произошла ошибка');
      }
    } catch (error) {
      alert('Ошибка соединения с сервером');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '300px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>{isLoginMode ? 'Вход' : 'Регистрация'}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isLoginMode && (
          <input type="text" placeholder="Имя пользователя" value={username} onChange={e => setUsername(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
        
        <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>
          {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        {isLoginMode ? (
          <Link to="/register">Нет аккаунта? Зарегистрируйтесь</Link>
        ) : (
          <Link to="/login">Уже есть аккаунт? Войти</Link>
        )}
      </div>
    </div>
  );
}

export default Auth;