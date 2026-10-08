import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token'); // Ищем токен авторизации
  
  if (!token) {
    // Если токена нет, перекидываем на страницу логина
    return <Navigate to="/login" replace />;
  }
  
  // Если токен есть, пускаем на закрытую страницу
  return children;
}

export default ProtectedRoute;