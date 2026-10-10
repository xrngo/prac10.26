import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
    localStorage.removeItem('token');
    navigate('/login'); 
  };

return (
    <div className="container">
      <div className="header">
        <h1>Аукцион: Каталог</h1>
        <div className="header-actions">
          <Link to="/create" className="link-text">+ Добавить лот</Link>
          <button onClick={handleLogout} className="btn btn-outline">Выйти</button>
        </div>
      </div>
      
      <h2>Доступные лоты:</h2>
      <div className="lots-grid">
        {lots.length === 0 ? <p>Загрузка лотов...</p> : null}
        {lots.map(lot => (
          <div key={lot.id} className="card">
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