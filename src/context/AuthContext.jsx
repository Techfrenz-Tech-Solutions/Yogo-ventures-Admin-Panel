/**
 * context/AuthContext.jsx — Authentication State
 * ─────────────────────────────────────────────
 * Fixes:
 *  - Separated initializing (session restore) from actionLoading (login/MFA spinner)
 *  - No double-toast: errors shown only once (not from both context and interceptor)
 *  - isDemoMode imported correctly from api.js
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setTokens, clearTokens, getAccessToken, isDemoMode } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin]               = useState(null);
  const [initializing, setInitializing] = useState(true);  // true only during startup session-restore
  const [authStage, setAuthStage]       = useState('idle'); // 'idle' | 'mfa_required'
  const [tempToken, setTempToken]       = useState(null);

  // ─── Restore session on mount ──────────────
  useEffect(() => {
    const token     = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('adminUser');
    if (token && savedUser) {
      try { setAdmin(JSON.parse(savedUser)); } catch { localStorage.clear(); }
    }
    setInitializing(false);
  }, []);

  // ─── Step 1: Email + Password login ────────
  // Calls the real backend (POST /auth/login), which returns a signed JWT.
  // The backend has no MFA endpoints, so this always resolves the session
  // in one step — authStage never moves to 'mfa_required'.
  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authAPI.login({ email_id: email, password });

      if (data.status !== 1) {
        const message = data.message || 'Invalid credentials. Please check your email and password.';
        toast.error(message);
        return { success: false, error: message };
      }

      // Backend returns "Bearer <token>" — store the raw token; the axios
      // interceptors add the "Bearer " prefix back on each request.
      const rawToken = (data.token || '').replace(/^Bearer\s+/i, '');
      setTokens(rawToken, null);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      setAdmin(data.user);
      setAuthStage('idle');
      toast.success(`Welcome, ${data.user.full_name}!`);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to reach the server. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // ─── Step 2: MFA token verification ────────
  const verifyMFA = useCallback(async (token) => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      return { success: false, error: 'Session expired.' };
    }
    try {
      const { data } = await authAPI.verifyMFA({ tempToken, token });
      setTokens(data.accessToken, data.refreshToken);
      setAdmin(data.admin);
      setAuthStage('idle');
      setTempToken(null);
      toast.success(`Welcome back, ${data.admin.firstName}!`);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid MFA code.';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [tempToken]);

  // ─── Logout ───────────────────────────────
  const logout = useCallback(async () => {
    clearTokens();
    setAdmin(null);
    setAuthStage('idle');
    setTempToken(null);
    toast.success('Logged out successfully.');
  }, []);

  // ─── Update admin fields locally ──────────
  const updateAdmin = useCallback((updates) => {
    setAdmin((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{
      admin,
      loading: initializing,      // only true during initial session restore, NOT during login action
      authStage,
      isAuthenticated: !!admin,
      login,
      verifyMFA,
      logout,
      updateAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
