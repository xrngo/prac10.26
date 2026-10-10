import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function CreateLot() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [minStep, setMinStep] = useState('500');
  const [durationPreset, setDurationPreset] = useState('3'); // days
  const [customEndTime, setCustomEndTime] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) {
            setCategoryId(data[0].id);
          }
        }
      })
      .catch(err => {
        console.error('Ошибка загрузки категорий:', err);
        setError('Не удалось загрузить список категорий');
      })
      .finally(() => setIsLoadingCategories(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!title.trim()) {
      setError('Пожалуйста, введите название лота');
      return;
    }
    if (!description.trim()) {
      setError('Пожалуйста, укажите описание лота');
      return;
    }
    if (!categoryId) {
      setError('Пожалуйста, выберите категорию');
      return;
    }

    const price = parseInt(startingPrice, 10);
    if (isNaN(price) || price <= 0) {
      setError('Стартовая цена должна быть положительным числом');
      return;
    }

    const step = parseInt(minStep, 10);
    if (isNaN(step) || step <= 0) {
      setError('Минимальный шаг ставки должен быть больше нуля');
      return;
    }

    let endTimeISO;
    if (durationPreset === 'custom') {
      if (!customEndTime) {
        setError('Пожалуйста, укажите дату и время окончания');
        return;
      }
      const customDate = new Date(customEndTime);
      if (customDate <= new Date()) {
        setError('Время окончания должно быть позже текущего времени');
        return;
      }
      endTimeISO = customDate.toISOString();
    } else {
      const days = parseInt(durationPreset, 10) || 3;
      const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      endTimeISO = targetDate.toISOString();
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/lots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          starting_price: price,
          min_step: step,
          end_time: endTimeISO
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Лот успешно создан и опубликован!');
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } else {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError(data.error || 'Ошибка при создании лота');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#0066cc', textDecoration: 'none', fontSize: '14px' }}>
          ← Вернуться в каталог лотов
        </Link>
        <h1 style={{ marginTop: '10px', fontSize: '26px', color: '#111' }}>
          Создание нового аукционного лота
        </h1>
        <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>
          Заполните данные о предмете для запуска открытых онлайн-торгов.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '18px',
          backgroundColor: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '18px',
          backgroundColor: '#dcfce7',
          border: '1px solid #4ade80',
          color: '#166534',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {/* Название */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Название лота *
          </label>
          <input
            type="text"
            placeholder="Например: Игровой ноутбук ASUS ROG 16GB"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '15px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Категория */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Категория *
          </label>
          {isLoadingCategories ? (
            <p style={{ color: '#666', fontSize: '14px' }}>Загрузка категорий...</p>
          ) : (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '15px',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Цены: стартовая и минимальный шаг */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Стартовая цена (₽) *
            </label>
            <input
              type="number"
              min="1"
              placeholder="10000"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Минимальный шаг ставки (₽) *
            </label>
            <input
              type="number"
              min="1"
              placeholder="500"
              value={minStep}
              onChange={(e) => setMinStep(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Длительность аукциона */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Длительность аукциона
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {[
              { label: '1 день', value: '1' },
              { label: '3 дня', value: '3' },
              { label: '7 дней', value: '7' },
              { label: '14 дней', value: '14' },
              { label: 'Указать дату', value: 'custom' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDurationPreset(item.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: durationPreset === item.value ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: durationPreset === item.value ? '#e0f2fe' : '#fff',
                  color: durationPreset === item.value ? '#0369a1' : '#334155',
                  fontWeight: durationPreset === item.value ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {durationPreset === 'custom' && (
            <input
              type="datetime-local"
              value={customEndTime}
              onChange={(e) => setCustomEndTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          )}
        </div>

        {/* Описание */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Описание лота *
          </label>
          <textarea
            rows="4"
            placeholder="Подробно опишите состояние предмета, характеристики, условия передачи покупателю..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '15px',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: isSubmitting ? '#94a3b8' : '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {isSubmitting ? 'Публикация лота...' : 'Опубликовать лот на аукцион'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateLot;
