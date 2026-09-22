import { createContext, useState, useEffect, useContext } from 'react';
import { auth as authApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vms_token') || null);

  useEffect(() => {
    // If we have a token but no user, we fetch the user's profile on mount
    const fetchUser = async () => {
      if (!token) return;
      try {
        const data = await authApi.me();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        console.error('Failed to fetch user', err);
      }
    };
    fetchUser();
  }, [token]);

  // Login function
  const login = (newToken, userData) => {
    localStorage.setItem('vms_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('vms_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
