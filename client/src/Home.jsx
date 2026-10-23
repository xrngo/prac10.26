import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import socket from './socket';

function Home() {
  const [lots, setLots] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(socket.connected);

  const navigate = useNavigate();

  const fetchLots = () => {
    fetch('http://localhost:5000/api/lots')
      .then(res => res.json())
      .then(data => setLots(Array.isArray(data) ? data : []))
      .catch(err => console.error('Ошибка загрузки лотов:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLots();

    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error('Ошибка загрузки категорий:', err));

    // Socket.io Real-time event listeners
    const handleConnect = () => setIsLiveConnected(true);
    const handleDisconnect = () => setIsLiveConnected(false);

    const handleBidPlaced = (data) => {
      setLots(prevLots =>
        prevLots.map(l => {
          if (l.id === data.lot_id) {
            const updatedBids = [data.bid, ...(l.bids || [])].filter(
              (b, idx, self) => idx === self.findIndex(t => t.id === b.id)
            );
            return {
              ...l,
              current_price: data.current_price,
              bids: updatedBids,
              ...(data.lot ? data.lot : {})
            };
          }
          return l;
        })
      );
    };

    const handleLotEnded = (data) => {
      setLots(prevLots =>
        prevLots.map(l => {
          if (l.id === data.lot_id) {
            return {
              ...l,
              status: 'completed',
              winner: data.winner,
              ...(data.lot ? data.lot : {})
            };
          }
          return l;
        })
      );
    };

    const handleLotCreated = (newLot) => {
      setLots(prevLots => {
        if (prevLots.some(l => l.id === newLot.id)) return prevLots;
        return [newLot, ...prevLots];
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('bid_placed', handleBidPlaced);
    socket.on('bid_update', handleBidPlaced);
    socket.on('lot_ended', handleLotEnded);
    socket.on('lot_created', handleLotCreated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('bid_placed', handleBidPlaced);
      socket.off('bid_update', handleBidPlaced);
      socket.off('lot_ended', handleLotEnded);
      socket.off('lot_created', handleLotCreated);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login'); 
  };

  const filteredLots = lots.filter(lot => {
    const matchesCategory = selectedCategory === 'all' || lot.category_id === selectedCategory || (lot.category && lot.category.id === selectedCategory);
    const matchesSearch = searchQuery === '' || 
      lot.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (lot.description && lot.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatRemainingTime = (endTime, status) => {
    if (status === 'completed') return 'Торги завершены';
    if (!endTime) return 'Не указано';
    const total = new Date(endTime).getTime() - Date.now();
    if (total <= 0) return 'Торги завершены';
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    if (days > 0) return `${days} дн. ${hours} ч.`;
    return `${hours} ч. ${minutes} мин.`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>Аукцион: Каталог</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              backgroundColor: isLiveConnected ? '#dcfce7' : '#fef3c7',
              color: isLiveConnected ? '#15803d' : '#b45309',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isLiveConnected ? '#22c55e' : '#f59e0b' }} />
              {isLiveConnected ? 'Live' : 'Подключение'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Платформа для проведения открытых онлайн-торгов в реальном времени
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/profile"
            style={{
              padding: '9px 16px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            Личный кабинет
          </Link>

          <Link
            to="/create-lot"
            style={{
              padding: '9px 16px',
              backgroundColor: '#0f172a',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            + Добавить лот
          </Link>
        </div>
      </header>

      {/* Поиск и категории */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="text"
          placeholder="Поиск по названию или описанию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1',
            padding: '10px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginRight: '4px' }}>
            Категория:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: selectedCategory === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              backgroundColor: selectedCategory === 'all' ? '#0f172a' : '#f8fafc',
              color: selectedCategory === 'all' ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: selectedCategory === cat.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
                backgroundColor: selectedCategory === cat.id ? '#0f172a' : '#f8fafc',
                color: selectedCategory === cat.id ? '#fff' : '#475569',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Список лотов */}
      <div>
        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '16px' }}>
          Активные аукционы ({filteredLots.length})
        </h2>

        {isLoading ? (
          <p style={{ color: '#64748b' }}>Загрузка каталога лотов...</p>
        ) : filteredLots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 16px 0' }}>В этой категории пока нет лотов</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {filteredLots.map(lot => {
              const categoryName = lot.category ? lot.category.name : 'Категория';
              const sellerName = lot.seller ? lot.seller.username : 'Продавец';
              const remainingTime = formatRemainingTime(lot.end_time, lot.status);
              const isActive = lot.status === 'active' && new Date(lot.end_time).getTime() > Date.now();

              // Лидер по ставкам
              const topBid = lot.bids && lot.bids.length > 0 ? lot.bids[0] : null;
              const leaderName = topBid && topBid.user ? topBid.user.username : 'Нет ставок';

              const mainImage = lot.images && lot.images.length > 0 ? lot.images[0].url : null;
              const imagesCount = lot.images ? lot.images.length : 0;

              return (
                <div
                  key={lot.id}
                  onClick={() => navigate(`/lot/${lot.id}`)}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#38bdf8';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {/* Изображение лота */}
                  <div style={{ position: 'relative', width: '100%', height: '190px', backgroundColor: '#f1f5f9' }}>
                    {mainImage ? (
                      <img src={mainImage} alt={lot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Нет фото
                      </div>
                    )}

                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '3px 8px', borderRadius: '4px' }}>
                        {categoryName}
                      </span>
                      {imagesCount > 1 && (
                        <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '3px 7px', borderRadius: '4px' }}>
                          Фото: {imagesCount}
                        </span>
                      )}
                    </div>

                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span style={{ fontSize: '11px', color: isActive ? '#15803d' : '#64748b', backgroundColor: isActive ? '#f0fdf4' : '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        {isActive ? 'Активен' : 'Завершен'}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#0f172a', lineHeight: '1.3' }}>
                        {lot.title}
                      </h3>
                      <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.4', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {lot.description}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Текущая ставка:</span>
                        <strong style={{ fontSize: '19px', color: '#0f172a' }}>
                          {lot.current_price?.toLocaleString('ru-RU')} ₽
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                        <span>Лидер:</span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{leaderName}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                        <span>До окончания:</span>
                        <span style={{ fontWeight: '500', color: isActive ? '#0f172a' : '#64748b' }}>{remainingTime}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                        <span>Продавец:</span>
                        <span style={{ color: '#334155' }}>{sellerName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;