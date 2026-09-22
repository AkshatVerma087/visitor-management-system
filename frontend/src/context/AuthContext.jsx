import { createContext, useState, useEffect, useContext } from 'react';
import { auth as authApi } from '../api';
import { setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try to fetch me(). The interceptor will automatically try to refresh the token!
        const data = await authApi.me();
        setUser(data.user);
      } catch (err) {
        // Normal if they aren't logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Login function (handles both token from response and setting user)
  const login = (newToken, userData) => {
    setAccessToken(newToken);
    setUser(userData);
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch(err) {}
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
