import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Auth({ isLoginMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/register';
    const payload = isLoginMode ? { email, password } : { username, email, password };

    try {
      const response = await fetch(endpoint, {
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
          setStatusMessage({ text: 'Регистрация успешна! Теперь войдите.', isError: false });
          setTimeout(() => navigate('/login'), 1500);
        }
      } else {
        setStatusMessage({ text: data.error || 'Произошла ошибка', isError: true });
      }
    } catch (error) {
      setStatusMessage({ text: 'Ошибка соединения с сервером', isError: true });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          {isLoginMode ? 'Вход' : 'Регистрация'}
        </h2>

        {statusMessage.text && (
          <div style={{
            padding: '10px 12px',
            marginBottom: '16px',
            borderRadius: '8px',
            backgroundColor: statusMessage.isError ? '#ffebee' : '#e8f5e9',
            color: statusMessage.isError ? '#c62828' : '#2e7d32',
            fontSize: '13px',
            fontWeight: '500',
            border: `1px solid ${statusMessage.isError ? '#ffcdd2' : '#c8e6c9'}`
          }}>
            {statusMessage.text}
          </div>
        )}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLoginMode && (
            <div className="auth-field">
              <label className="auth-label">Имя пользователя</label>
              <input 
                type="text" 
                className="auth-input"
                placeholder="Введите имя" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input 
              type="email" 
              className="auth-input"
              placeholder="name@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Пароль</label>
            <input 
              type="password" 
              className="auth-input"
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="auth-button">
            {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-footer">
          {isLoginMode ? (
            <>
              Нет аккаунта?{' '}
              <Link to="/register" className="auth-link">
                Зарегистрируйтесь
              </Link>
            </>
          ) : (
            <>
              Уже есть аккаунт?{' '}
              <Link to="/login" className="auth-link">
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;