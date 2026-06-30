/**
 * pages/LoginPage.jsx — Admin Login Form
 * ─────────────────────────────────────────────
 * Fixes:
 *  - Local loading state is fully self-contained (does not depend on AuthContext.loading)
 *  - navigate() called correctly after login resolves
 *  - Demo mode hint shown below form
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../services/api';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 4) errs.password = 'Password is too short';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result?.mfaRequired) {
        navigate('/mfa');
      } else if (result?.success) {
        navigate('/dashboard');
      }
      // On failure, toast already shown inside login()
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-primary-600">Welcome back</h2>
        <p className="text-primary-400 text-sm mt-1.5">Sign in to your admin dashboard</p>
      </div>

      {/* Credentials hint */}
      <div className="mb-5 bg-accent-100 border border-accent-300 rounded-xl px-4 py-3 text-sm text-primary-600">
        <strong>Demo Credentials</strong> — Email:&nbsp;
        <code className="bg-white/60 px-1 rounded">admin@demo.com</code>&nbsp;/ Password:&nbsp;
        <code className="bg-white/60 px-1 rounded">Admin@123</code>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@yourstore.com"
              className={`form-input pl-10 ${errors.email ? 'form-input-error' : ''}`}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="form-group">
          <div className="flex items-center justify-between mb-1.5">
            <label className="form-label mb-0">Password</label>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className={`form-input pl-10 pr-10 ${errors.password ? 'form-input-error' : ''}`}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-primary-300 hover:text-primary-500"
              tabIndex={-1}
            >
              {showPass ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="form-error">{errors.password}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center btn-lg mt-2"
        >
          {loading ? (
            <>
              <div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Security note */}
      <p className="text-center text-xs text-primary-300 mt-8 flex items-center justify-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Secured with JWT + MFA Authentication
      </p>
    </div>
  );
};

export default LoginPage;
