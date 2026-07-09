import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, isAdmin }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    // No token? Send them to login
    return <Navigate to="/" />;
  }

  if (isAdmin && role !== 'admin') {
    // Trying to access Admin area but not an admin? Send to User Dashboard
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;