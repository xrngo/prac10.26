import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Auth from './Auth';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* (аналог @login_required) */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        
        {/* открытые страницы */}
        <Route path="/login" element={<Auth isLoginMode={true} />} />
        <Route path="/register" element={<Auth isLoginMode={false} />} />
        
        {/* обработка несуществующих ссылок */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;