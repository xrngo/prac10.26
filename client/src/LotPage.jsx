import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import socket from './socket';

function LotPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lot, setLot] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuyingOut, setIsBuyingOut] = useState(false);
  const [showBuyoutConfirm, setShowBuyoutConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isLiveConnected, setIsLiveConnected] = useState(socket.connected);

  const token = localStorage.getItem('token');

  // Load current user profile
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:5000/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) setCurrentUser(data);
      })
      .catch(() => {});
  }, [token, navigate]);

  // Load lot details
  const fetchLot = () => {
    fetch(`http://localhost:5000/api/lots/${id}`)
      .then(async res => {
        if (!res.ok) throw new Error('Лот не найден');
        return res.json();
      })
      .then(data => {
        setLot(data);
        if (data.images && data.images.length > 0) {
          setActiveImageIndex(0);
        }
      })
      .catch(err => {
        console.error(err);
        setBidError(err.message || 'Ошибка загрузки лота');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLot();

    socket.emit('join_lot', id);

    const handleConnect = () => setIsLiveConnected(true);
    const handleDisconnect = () => setIsLiveConnected(false);

    const handleBidUpdate = (data) => {
      if (data.lot_id === id) {
        setLot(prev => {
          if (!prev) return prev;
          const updatedBids = [data.bid, ...(prev.bids || [])].filter(
            (b, idx, self) => idx === self.findIndex(t => t.id === b.id)
          );
          return {
            ...prev,
            current_price: data.current_price,
            bids: updatedBids,
            ...(data.lot ? data.lot : {})
          };
        });
      }
    };

    const handleLotEnded = (data) => {
      if (data.lot_id === id) {
        setLot(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'completed',
            winner: data.winner,
            ...(data.lot ? data.lot : {})
          };
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('bid_placed', handleBidUpdate);
    socket.on('bid_update', handleBidUpdate);
    socket.on('lot_ended', handleLotEnded);

    return () => {
      socket.emit('leave_lot', id);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('bid_placed', handleBidUpdate);
      socket.off('bid_update', handleBidUpdate);
      socket.off('lot_ended', handleLotEnded);
    };
  }, [id]);

  // eslint-disable-next-line
  useEffect(() => {
    if (!lot || !lot.end_time) return;

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(lot.end_time).getTime();
      const diff = end - now;

      if (diff <= 0 || lot.status !== 'active') {
        setTimeLeft('Торги завершены');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days} дн. ${hours} ч. ${minutes} мин. ${seconds} сек.`);
      } else {
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lot]);

  // Execute Bid API request
  const submitBidAmount = async (amountToBid) => {
    setBidError('');
    setBidSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`http://localhost:5000/api/lots/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountToBid })
      });

      const data = await response.json();

      if (response.ok) {
        setBidSuccess(`Ставка ${amountToBid.toLocaleString('ru-RU')} ₽ успешно принята`);
        setBidAmount('');
        if (data.lot) {
          setLot(data.lot);
        }
      } else {
        setBidError(data.error || 'Ошибка при совершении ставки');
      }
    } catch (err) {
      console.error(err);
      setBidError('Ошибка связи с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Bid (+min_step ₽)
  const handleQuickBid = () => {
    if (!lot) return;
    const step = Number(lot.min_step) || 500;
    const nextAmount = (Number(lot.current_price) || 0) + step;
    submitBidAmount(nextAmount);
  };

  // Form custom bid
  const handleCustomBidSubmit = (e) => {
    e.preventDefault();
    const step = Number(lot.min_step) || 500;
    const minRequired = (Number(lot.current_price) || 0) + step;
    const numericAmount = parseInt(bidAmount, 10);

    if (isNaN(numericAmount) || numericAmount < minRequired) {
      setBidError(`Ставка должна быть не менее ${minRequired.toLocaleString('ru-RU')} ₽`);
      return;
    }

    submitBidAmount(numericAmount);
  };

  // Buyout action (Мгновенный выкуп)
  const handleBuyoutSubmit = async () => {
    setBidError('');
    setBidSuccess('');
    setIsBuyingOut(true);

    try {
      const response = await fetch(`http://localhost:5000/api/lots/${id}/buyout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setBidSuccess('Лот успешно выкуплен вами');
        setShowBuyoutConfirm(false);
        if (data.lot) {
          setLot(data.lot);
        }
      } else {
        setBidError(data.error || 'Ошибка при выкупе лота');
      }
    } catch (err) {
      console.error(err);
      setBidError('Ошибка связи с сервером при выкупе');
    } finally {
      setIsBuyingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Загрузка страницы лота...
      </div>
    );
  }

  if (!lot) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '24px', textAlign: 'center' }}>
        <h2 style={{ color: '#0f172a' }}>Лот не найден</h2>
        <Link to="/" className="back-btn"> <span className="back-btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></span>
    </Link>
      </div>
    );
  }

  const isSeller = currentUser && lot.seller && (currentUser.id === lot.seller_id || currentUser.id === lot.seller.id);
  const isActive = lot.status === 'active' && new Date(lot.end_time).getTime() > Date.now();
  const minStep = Number(lot.min_step) || 500;
  const minRequired = (Number(lot.current_price) || 0) + minStep;
  const quickBidPrice = minRequired;

  // Buyout price calculation
  const buyoutPrice = Math.max(
    Math.round(lot.starting_price * 1.5),
    (lot.current_price || lot.starting_price) + minStep * 2
  );

  const images = (lot.images && lot.images.length > 0) ? lot.images : [];
  const currentImage = images[activeImageIndex] ? images[activeImageIndex].url : null;

  const topBid = lot.bids && lot.bids.length > 0 ? lot.bids[0] : null;
  const leaderName = topBid && topBid.user ? topBid.user.username : 'Ставок еще нет';
  const isLeader = currentUser && topBid && topBid.user && (topBid.user.id === currentUser.id || topBid.user.username === currentUser.username);
  
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
                    }}>
                      
                    <span>Аукцион: лот</span>
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
                
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                  Страница открытого товара
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
              </div>
            </header>
      {/* Верхняя навигация */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(320px, 1fr)', gap: '32px' }}>
        {/* Левая колонка: Галерея картинок */}
        <div>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            position: 'relative'
          }}>
            {currentImage ? (
              <img
                src={currentImage}
                alt={lot.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '14px' }}>
                Изображение отсутствует
              </div>
            )}

            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
              <span style={{
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {lot.category ? lot.category.name : 'Категория'}
              </span>
            </div>

            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <span style={{
                backgroundColor: isActive ? '#f0fdf4' : '#f8fafc',
                color: isActive ? '#15803d' : '#475569',
                border: '1px solid #e2e8f0',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {isActive ? 'Активен' : 'Завершен'}
              </span>
            </div>
          </div>

          {/* Превью миниатюр в галерее */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    border: activeImageIndex === idx ? '2px solid #0f172a' : '1px solid #cbd5e1',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    width: '68px',
                    height: '68px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    padding: 0,
                    backgroundColor: '#fff',
                    outline: 'none'
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* Описание */}
          <div style={{ marginTop: '20px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
              Описание лота
            </h3>
            <p style={{ margin: 0, color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
              {lot.description}
            </p>
          </div>
        </div>

        {/* Правая колонка: Торги, Быстрая ставка, Выкуп */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a', lineHeight: '1.3' }}>
              {lot.title}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
              Продавец: <strong style={{ color: '#334155' }}>{lot.seller ? lot.seller.username : 'Неизвестно'}</strong>
            </p>
          </div>

          {/* Блок цены и таймера */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Текущая ставка:</span>
              <strong style={{ fontSize: '30px', color: '#0f172a' }}>
                {lot.current_price?.toLocaleString('ru-RU')} ₽
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
              <span>Лидер торгов:</span>
              <strong style={{ color: isLeader ? '#15803d' : '#0f172a' }}>
                {leaderName} {isLeader && '(ваша ставка)'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
              <span>Минимальный шаг:</span>
              <span style={{ fontWeight: '500' }}>+{minStep.toLocaleString('ru-RU')} ₽</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <span>До завершения:</span>
              <strong style={{ color: isActive ? '#0f172a' : '#64748b' }}>
                {timeLeft}
              </strong>
            </div>

            {/* Победитель (если завершен) */}
            {lot.status === 'completed' && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px'
              }}>
                <div style={{ fontWeight: '600', color: '#166534', fontSize: '14px' }}>Аукцион завершен</div>
                <div style={{ color: '#14532d', fontSize: '13px', marginTop: '2px' }}>
                  Победитель: <strong>{lot.winner ? lot.winner.username : (topBid ? topBid.user?.username : 'Победитель не определен')}</strong> с итоговой ценой <strong>{lot.current_price?.toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            )}
          </div>

          {/* Сообщения */}
          {bidError && (
            <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
              {bidError}
            </div>
          )}

          {bidSuccess && (
            <div style={{ padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '6px', fontSize: '13px' }}>
              {bidSuccess}
            </div>
          )}

          {/* Панель ставок */}
          {isActive && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isSeller ? (
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', fontSize: '13px' }}>
                  Вы создатель данного лота. Делать ставки на свои лоты запрещено.
                </div>
              ) : (
                <>
                  {/* КНОПКА БЫСТРОЙ СТАВКИ В СПОКОЙНЫХ ТОНАХ */}
                  <div>
                    <button
                      type="button"
                      onClick={handleQuickBid}
                      disabled={isSubmitting || isBuyingOut}
                      style={{
                        width: '100%',
                        padding: '15px 20px',
                        backgroundColor: '#15803d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: (isSubmitting || isBuyingOut) ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (!isSubmitting) e.currentTarget.style.backgroundColor = '#166534';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#15803d';
                      }}
                    >
                      {isSubmitting
                        ? 'Отправка...'
                        : `Быстрая ставка +${minStep.toLocaleString('ru-RU')} ₽ (${quickBidPrice.toLocaleString('ru-RU')} ₽)`}
                    </button>
                    <p style={{ margin: '5px 0 0 0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      Повышение текущей ставки на {minStep.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>

                  {/* КНОПКА МГНОВЕННОГО ВЫКУПА */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    {!showBuyoutConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowBuyoutConfirm(true)}
                        disabled={isSubmitting || isBuyingOut}
                        style={{
                          width: '100%',
                          padding: '13px 18px',
                          backgroundColor: '#1e293b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: (isSubmitting || isBuyingOut) ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          if (!isBuyingOut) e.currentTarget.style.backgroundColor = '#0f172a';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = '#1e293b';
                        }}
                      >
                        Мгновенный выкуп за {buyoutPrice.toLocaleString('ru-RU')} ₽
                      </button>
                    ) : (
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                          Выкупить лот за {buyoutPrice.toLocaleString('ru-RU')} ₽ и завершить аукцион вашей победой?
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={handleBuyoutSubmit}
                            disabled={isBuyingOut}
                            style={{
                              flex: 1,
                              padding: '9px',
                              backgroundColor: '#0f172a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              fontSize: '13px',
                              cursor: isBuyingOut ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isBuyingOut ? 'Выкуп...' : 'Подтвердить выкуп'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBuyoutConfirm(false)}
                            style={{
                              padding: '9px 14px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Произвольная ставка */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '6px' }}>
                      Своя сумма (минимум {minRequired.toLocaleString('ru-RU')} ₽):
                    </span>

                    <form onSubmit={handleCustomBidSubmit} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        placeholder={String(minRequired)}
                        min={minRequired}
                        required
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || isBuyingOut}
                        style={{
                          padding: '9px 16px',
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: (isSubmitting || isBuyingOut) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Поставить
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* История ставок */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                История ставок ({lot.bids?.length || 0})
              </h3>
            </div>

            {!lot.bids || lot.bids.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Ставок пока нет</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                {lot.bids.map((b, index) => {
                  const isTop = index === 0;
                  return (
                    <div
                      key={b.id || index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: isTop ? '#f8fafc' : '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: isTop ? '600' : '400', color: '#0f172a' }}>
                          {b.user ? b.user.username : 'Пользователь'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(b.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}, {new Date(b.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <strong style={{ fontSize: '15px', color: isTop ? '#0f172a' : '#475569' }}>
                        {b.amount?.toLocaleString('ru-RU')} ₽
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LotPage;