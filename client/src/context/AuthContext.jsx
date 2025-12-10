import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
        localStorage.setItem('token', token);
        // Fetch user profile
        api.get('/users/me')
           .then(res => setUser(res.data))
           .catch(err => console.error("Failed to fetch user", err));
    } else {
        localStorage.removeItem('token');
        setUser(null);
    }
  }, [token]);

  const login = (newToken, redirectPath = '/dashboard') => {
    setToken(newToken);
    return redirectPath;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
