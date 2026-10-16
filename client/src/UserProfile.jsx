import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [bids, setBids] = useState([]);
  const [myLots, setMyLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bids'); // 'bids' | 'lots' | 'edit'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:5000/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(userData => {
        setUser(userData);
        setUsername(userData.username || '');
        setEmail(userData.email || '');

        return Promise.all([
          fetch('http://localhost:5000/api/my-bids', {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.json())
            .catch(() => []),

          fetch('http://localhost:5000/api/lots')
            .then(res => res.json())
            .catch(() => [])
        ]).then(([bidsData, allLots]) => {
          setBids(Array.isArray(bidsData) ? bidsData : []);

          if (Array.isArray(allLots) && userData) {
            const userLots = allLots.filter(
              lot =>
                lot.seller_id === userData.id ||
                (lot.seller && lot.seller.id === userData.id) ||
                (lot.seller && lot.seller.username === userData.username)
            );
            setMyLots(userLots);
          }
        });
      })
      .catch(err => {
        console.error('Ошибка загрузки данных профиля:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setEditMessage('');
    setIsUpdating(true);

    fetch('http://localhost:5000/api/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username, email })
    })
      .then(res => {
        if (!res.ok) throw new Error('Ошибка обновления');
        return res.json();
      })
      .then(updatedUser => {
        setUser(updatedUser);
        setEditMessage('Профиль успешно сохранен');
      })
      .catch(err => {
        console.error(err);
        setEditMessage('Не удалось обновить данные профиля');
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Загрузка личного кабинета...
      </div>
    );
  }

  // Count won lots
  const wonLots = bids.filter(b => b.lot && b.lot.status === 'completed' && b.lot.winner_id === user?.id);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '20px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <Link to="/"
            style={{ textDecoration: 'none', display: 'inline-block' }}
            title="Вернуться в каталог лотов"
          >
            <h1
              style={{
                margin: 0,
                fontSize: '26px',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span>Аукцион: Личный кабинет</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
              </span>
            </h1>
          </Link>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Управление ставками, аукционами и личными данными
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              padding: '9px 16px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Каталог лотов
          </Link>

          <button
            onClick={handleLogout}
            style={{
              padding: '9px 16px',
              backgroundColor: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '28px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Профиль участника
            </span>
            <h2 style={{ margin: '4px 0 2px 0', fontSize: '24px', color: '#0f172a' }}>
              {user ? user.username : 'Пользователь'}
            </h2>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
              {user ? user.email : ''}
            </p>
          </div>

          {/* Статистика */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 18px', textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{bids.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Всего ставок</div>
            </div>

            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 18px', textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{myLots.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Создано лотов</div>
            </div>

            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 18px', textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#15803d' }}>{wonLots.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Выиграно</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('bids')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'bids' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'bids' ? '#fff' : '#475569',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Мои ставки ({bids.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lots')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'lots' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'lots' ? '#fff' : '#475569',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Мои аукционы ({myLots.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'edit' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'edit' ? '#fff' : '#475569',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Настройки профиля
        </button>
      </div>

      {activeTab === 'bids' && (
        <div>
          <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '16px' }}>
            История сделанных ставок
          </h3>
          {bids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b' }}>
              Вы пока не делали ставок. Перейдите в <Link to="/" style={{ color: '#0369a1' }}>каталог</Link>, чтобы выбрать лот.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bids.map(bid => {
                const isWon = bid.lot && bid.lot.status === 'completed' && bid.lot.winner_id === user?.id;
                const isActive = bid.lot && bid.lot.status === 'active';

                return (
                  <div
                    key={bid.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      background: '#fff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#0f172a' }}>
                        <Link to={`/lot/${bid.lot_id || bid.lot?.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                          {bid.lot?.title || 'Лот'} →
                        </Link>
                      </h4>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Сделана: {new Date(bid.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Ваша ставка:</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                        {bid.amount?.toLocaleString('ru-RU')} ₽
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isWon ? '#dcfce7' : isActive ? '#f1f5f9' : '#f8fafc',
                          color: isWon ? '#15803d' : isActive ? '#334155' : '#64748b',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {isWon ? 'Выигран вами' : isActive ? 'Торги идут' : 'Завершен'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lots' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', color: '#0f172a', margin: 0 }}>
              Созданные вами аукционы
            </h3>
            <Link
              to="/create-lot"
              style={{
                padding: '6px 14px',
                backgroundColor: '#0f172a',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              + Добавить лот
            </Link>
          </div>

          {myLots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b' }}>
              У вас еще нет созданных лотов. Нажмите «+ Добавить лот», чтобы выставить предмет на торги.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myLots.map(lot => (
                <div
                  key={lot.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#0f172a' }}>
                      <Link to={`/lot/${lot.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                        {lot.title} →
                      </Link>
                    </h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', maxWidth: '500px' }}>
                      {lot.description}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Текущая цена:</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                      {lot.current_price?.toLocaleString('ru-RU')} ₽
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: lot.status === 'active' ? '#f0fdf4' : '#f8fafc',
                        color: lot.status === 'active' ? '#15803d' : '#64748b',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      {lot.status === 'active' ? 'Активен' : 'Завершен'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '8px', maxWidth: '500px' }}>
          <h3 style={{ fontSize: '18px', color: '#0f172a', marginTop: 0, marginBottom: '16px' }}>
            Персональные данные
          </h3>

          {editMessage && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '6px', fontSize: '14px' }}>
              {editMessage}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Имя пользователя:
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Email адрес:
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              style={{
                padding: '10px 18px',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-start'
              }}
            >
              {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}