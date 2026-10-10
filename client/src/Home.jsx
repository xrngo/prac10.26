import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Home() {
  const [lots, setLots] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/lots')
      .then(res => res.json())
      .then(data => setLots(Array.isArray(data) ? data : []))
      .catch(err => console.error('Ошибка загрузки лотов:', err))
      .finally(() => setIsLoading(false));

    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error('Ошибка загрузки категорий:', err));
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

  const formatRemainingTime = (endTime) => {
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
          <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>Аукцион: Каталог</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Платформа для проведения открытых онлайн-торгов
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/create-lot"
            style={{
              padding: '10px 18px',
              backgroundColor: '#0284c7',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            + Добавить лот
          </Link>

          <button
            onClick={handleLogout}
            style={{
              padding: '9px 16px',
              backgroundColor: '#f1f5f9',
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

      {/* Поиск и фильтры по категориям */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1',
              minWidth: '260px',
              padding: '10px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Категории */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginRight: '4px' }}>
            Категория:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedCategory === 'all' ? '1px solid #0284c7' : '1px solid #e2e8f0',
              backgroundColor: selectedCategory === 'all' ? '#0284c7' : '#f8fafc',
              color: selectedCategory === 'all' ? '#fff' : '#475569',
              fontSize: '13px',
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
                borderRadius: '20px',
                border: selectedCategory === cat.id ? '1px solid #0284c7' : '1px solid #e2e8f0',
                backgroundColor: selectedCategory === cat.id ? '#0284c7' : '#f8fafc',
                color: selectedCategory === cat.id ? '#fff' : '#475569',
                fontSize: '13px',
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
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 16px 0' }}>
              В этой категории пока нет лотов
            </p>
            <Link
              to="/create-lot"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#0284c7',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              + Создать первый лот
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filteredLots.map(lot => {
              const categoryName = lot.category ? lot.category.name : 'Категория';
              const sellerName = lot.seller ? lot.seller.username : 'Продавец';
              const remainingTime = formatRemainingTime(lot.end_time);

              return (
                <div
                  key={lot.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#0369a1',
                        backgroundColor: '#e0f2fe',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}>
                        {categoryName}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        {lot.status === 'active' ? 'Активен' : lot.status}
                      </span>
                    </div>

                    <h3 style={{ margin: '8px 0', fontSize: '18px', color: '#0f172a' }}>
                      {lot.title}
                    </h3>

                    <p style={{
                      color: '#475569',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      margin: '0 0 16px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {lot.description}
                    </p>
                  </div>

                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Текущая ставка:</span>
                      <strong style={{ fontSize: '18px', color: '#0284c7' }}>
                        {lot.current_price?.toLocaleString('ru-RU')} ₽
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                      <span>Шаг ставки:</span>
                      <span style={{ fontWeight: '500', color: '#334155' }}>
                        +{lot.min_step?.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                      <span>До окончания:</span>
                      <span style={{ fontWeight: '600', color: '#e11d48' }}>
                        ⏱ {remainingTime}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      <span>Продавец:</span>
                      <span style={{ color: '#334155' }}>{sellerName}</span>
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
