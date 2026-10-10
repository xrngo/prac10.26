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
    <div className="form-container">
      <h2>{isLoginMode ? 'Вход' : 'Регистрация'}</h2>
      
      <form onSubmit={handleSubmit} className="form-column">
        {!isLoginMode && (
          <input type="text" placeholder="Имя пользователя" value={username} onChange={e => setUsername(e.target.value)} required className="form-input" />
        )}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="form-input" />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required className="form-input" />
        
        <button type="submit" className="btn btn-primary">
          {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>

      <div className="text-center">
        {isLoginMode ? (
          <Link to="/register" className="link-text">Нет аккаунта? Зарегистрируйтесь</Link>
        ) : (
          <Link to="/login" className="link-text">Уже есть аккаунт? Войти</Link>
        )}
      </div>
    </div>
  );
}

export default Auth;