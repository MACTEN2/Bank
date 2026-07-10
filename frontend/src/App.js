import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Settings from './components/Settings';
import Support from './components/Support';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeModeProvider } from './ThemeModeContext';

function App() {
  return (
    <ThemeModeProvider>
    <Router>
      <Routes>
        {/* This path="/" ensures Login shows first when you load the page */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute isAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute isAdmin={false}>
            <UserDashboard />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute isAdmin={false}>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/support" element={
          <ProtectedRoute isAdmin={false}>
            <Support />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
    </ThemeModeProvider>
  );
}

export default App; // IMPORTANT: If this is missing, the screen will be blank