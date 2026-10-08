import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [lots, setLots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/lots')
      .then(res => res.json())
      .then(data => setLots(data))
      .catch(err => console.error(err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Удаляем токен
    navigate('/login'); // Перекидываем на авторизацию
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Аукцион: Каталог</h1>
        <button onClick={handleLogout} style={{ padding: '8px', cursor: 'pointer' }}>Выйти</button>
      </div>
      
      <h2>Доступные лоты:</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {lots.length === 0 ? <p>Загрузка лотов...</p> : null}
        {lots.map(lot => (
          <div key={lot.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', width: '250px' }}>
            <h3>{lot.title}</h3>
            <p>{lot.description}</p>
            <p><strong>Текущая ставка:</strong> {lot.current_price} руб.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;