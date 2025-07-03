import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // Correct import

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const userRole = decoded.role;

    if (allowedRoles && allowedRoles.includes(userRole)) {
      return <Outlet />;
    }

    // If the role is not allowed, redirect
    // For example, if an admin tries to access a voter page
    return <Navigate to="/" replace />;

  } catch (error) {
    console.error('Invalid token:', error);
    localStorage.clear(); // Clear invalid token
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
