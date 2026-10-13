import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Auth from './Auth';
import CreateLot from './CreateLot';
import UserProfile from './UserProfile'; // 1. Импортируем компонент профиля
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/create-lot" element={<ProtectedRoute><CreateLot /></ProtectedRoute>} />
        {/* 2. Добавляем маршрут для Личного кабинета */}
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        
        <Route path="/login" element={<Auth isLoginMode={true} />} />
        <Route path="/register" element={<Auth isLoginMode={false} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;