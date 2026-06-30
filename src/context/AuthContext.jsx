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
    const restore = async () => {
      const token = getAccessToken();
      if (!token) { setInitializing(false); return; }
      try {
        const { data } = await authAPI.getMe();
        setAdmin(data.admin);
      } catch {
        clearTokens();
      } finally {
        setInitializing(false);
      }
    };
    restore();
  }, []);

  // ─── Step 1: Email + Password login ────────
  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authAPI.login({ email, password });

      if (data.mfaRequired) {
        setTempToken(data.tempToken);
        setAuthStage('mfa_required');
        toast.success('Enter your Google Authenticator code.');
        return { mfaRequired: true };
      }

      setTokens(data.accessToken, data.refreshToken);
      setAdmin(data.admin);
      setAuthStage('idle');
      const demoSuffix = isDemoMode() ? ' (Demo Mode — use admin@demo.com / Admin@123)' : '';
      toast.success(`Welcome back, ${data.admin.firstName}!${demoSuffix}`);
      return { success: true };
    } catch (err) {
      // Show error once here — suppress in axios interceptor (interceptor skips 401s)
      const message = err.response?.data?.message || 'Login failed. Check your credentials.';
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
    try { await authAPI.logout(); } catch {}
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
