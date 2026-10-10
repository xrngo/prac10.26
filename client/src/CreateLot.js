import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateLot() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [minStep, setMinStep] = useState('');
  const [endTime, setEndTime] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  
  const navigate = useNavigate();

  // Загружаем список категорий при открытии страницы
  useEffect(() => {
    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id); // Выбираем первую по умолчанию
      })
      .catch(err => console.error('Ошибка загрузки категорий:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:5000/api/lots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          description, 
          starting_price: startingPrice,
          min_step: minStep,
          end_time: endTime,
          category_id: categoryId
        })
      });
      
      if (response.ok) {
        alert('Лот успешно создан!');
        navigate('/');
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при создании');
      }
    } catch (error) {
      alert('Ошибка соединения с сервером');
    }
  };

  return (
    <div className="form-container wide">
      <h2>Создать новый лот</h2>
      
      <form onSubmit={handleSubmit} className="form-column">
        <input type="text" placeholder="Название лота" value={title} onChange={e => setTitle(e.target.value)} required className="form-input" />
        
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="form-input">
          <option value="" disabled>Выберите категорию</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <textarea placeholder="Описание" rows="4" value={description} onChange={e => setDescription(e.target.value)} required className="form-input" />
        
        <input type="number" placeholder="Стартовая цена (руб.)" min="1" value={startingPrice} onChange={e => setStartingPrice(e.target.value)} required className="form-input" />
        
        <input type="number" placeholder="Шаг ставки (мин. сумма, руб.)" min="1" value={minStep} onChange={e => setMinStep(e.target.value)} required className="form-input" />
        
        <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required className="form-input" title="Время окончания аукциона" />
        
        <button type="submit" className="btn btn-success">Опубликовать лот</button>
        <button type="button" onClick={() => navigate('/')} className="btn btn-outline">Отмена</button>
      </form>
    </div>
  );
}

export default CreateLot;