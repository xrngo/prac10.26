import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [bids, setBids] = useState([]);
    const [myLots, setMyLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bids'); // 'bids' | 'lots' | 'edit'

    // Состояния для формы редактирования профиля
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [editMessage, setEditMessage] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        // 1. Сначала загружаем данные авторизованного пользователя
        fetch('http://localhost:5000/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(userData => {
            setUser(userData);
            setUsername(userData.username || '');
            setEmail(userData.email || '');

            // 2. Параллельно загружаем все лоты и мои ставки
            return Promise.all([
                fetch('http://localhost:5000/api/my-bids', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()).catch(() => []),

                fetch('http://localhost:5000/api/lots')
                    .then(res => res.json())
                    .catch(() => [])
            ]).then(([bidsData, allLots]) => {
                setBids(Array.isArray(bidsData) ? bidsData : []);

                // Фильтруем лоты: оставляем только те, где seller_id или seller.id совпадает с ID текущего пользователя
                if (Array.isArray(allLots) && userData) {
                    const userLots = allLots.filter(lot => 
                        lot.seller_id === userData.id || 
                        (lot.seller && lot.seller.id === userData.id) ||
                        (lot.seller && lot.seller.username === userData.username)
                    );
                    setMyLots(userLots);
                }
            });
        })
        .catch(err => {
            console.error("Ошибка загрузки данных профиля:", err);
        })
        .finally(() => {
            setLoading(false);
        });
    }, [token, navigate]);

    // Обработка сохранения профиля
    const handleUpdateProfile = (e) => {
        e.preventDefault();
        setEditMessage('');

        fetch('http://localhost:5000/api/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, email })
        })
        .then(res => {
            if (!res.ok) throw new Error('Ошибка обновления');
            return res.json();
        })
        .then(updatedUser => {
            setUser(updatedUser);
            setEditMessage('Профиль успешно обновлен!');
        })
        .catch(err => {
            console.error(err);
            setEditMessage('Не удалось обновить профиль.');
        });
    };

    if (loading) return <div style={{ padding: '20px' }}>Загрузка личного кабинета...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <button 
                onClick={() => navigate('/')} 
                style={{ 
                    marginBottom: '20px', 
                    padding: '9px 16px', 
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer' 
                }}
            >
                ← Назад к каталогу
            </button>

            {/* Приветствие пользователя */}
            <div style={{ 
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                color: '#fff', 
                padding: '24px', 
                borderRadius: '10px', 
                marginBottom: '24px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '26px' }}>
                    Личный кабинет: {user ? user.username : 'Пользователь'}
                </h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                    Email: {user ? user.email : ''}
                </p>
            </div>

            {/* Вкладки навигации */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <button
                    onClick={() => setActiveTab('bids')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: activeTab === 'bids' ? '#0284c7' : '#f1f5f9',
                        color: activeTab === 'bids' ? '#fff' : '#475569',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    Мои ставки ({bids.length})
                </button>
                <button
                    onClick={() => setActiveTab('lots')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: activeTab === 'lots' ? '#0284c7' : '#f1f5f9',
                        color: activeTab === 'lots' ? '#fff' : '#475569',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    Мои аукционы ({myLots.length})
                </button>
                <button
                    onClick={() => setActiveTab('edit')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: activeTab === 'edit' ? '#0284c7' : '#f1f5f9',
                        color: activeTab === 'edit' ? '#fff' : '#475569',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    Редактировать профиль
                </button>
            </div>

            {/* Вкладка 1: Мои ставки */}
            {activeTab === 'bids' && (
                <div>
                    <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '16px' }}>Актуальные ставки</h3>
                    {bids.length === 0 ? (
                        <p style={{ color: '#64748b' }}>Вы еще не делали ставок ни на один лот.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {bids.map(bid => (
                                <div key={bid.id} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{bid.lot?.title || 'Лот'}</h4>
                                    <p style={{ margin: '4px 0', color: '#334155' }}>Ваша ставка: <strong>{bid.amount?.toLocaleString('ru-RU')} ₽</strong></p>
                                    <p style={{ margin: '4px 0', color: '#334155' }}>Текущая цена лота: {bid.lot?.current_price?.toLocaleString('ru-RU')} ₽</p>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                                        Статус лота: {bid.lot?.status} | Сделана: {new Date(bid.created_at).toLocaleString('ru-RU')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Вкладка 2: Мои аукционы */}
            {activeTab === 'lots' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>Созданные мной лоты</h3>
                        <button
                            onClick={() => navigate('/create-lot')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            + Добавить лот
                        </button>
                    </div>

                    {myLots.length === 0 ? (
                        <p style={{ color: '#64748b' }}>Вы еще не создали ни одного аукциона.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {myLots.map(lot => (
                                <div key={lot.id} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <h4 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{lot.title}</h4>
                                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: lot.status === 'active' ? '#dcfce7' : '#f1f5f9', color: lot.status === 'active' ? '#15803d' : '#475569', fontWeight: '600' }}>
                                            {lot.status === 'active' ? 'Активен' : lot.status}
                                        </span>
                                    </div>
                                    <p style={{ margin: '4px 0', color: '#475569', fontSize: '14px' }}>{lot.description}</p>
                                    <p style={{ margin: '8px 0 0 0', color: '#0284c7', fontWeight: '600' }}>
                                        Текущая цена: {lot.current_price?.toLocaleString('ru-RU')} ₽
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Вкладка 3: Редактирование профиля */}
            {activeTab === 'edit' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '20px', color: '#1e293b', marginTop: 0, marginBottom: '16px' }}>Редактирование профиля</h3>
                    
                    {editMessage && (
                        <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '14px' }}>
                            {editMessage}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Имя пользователя:
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Email:
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                alignSelf: 'flex-start'
                            }}
                        >
                            Сохранить изменения
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}