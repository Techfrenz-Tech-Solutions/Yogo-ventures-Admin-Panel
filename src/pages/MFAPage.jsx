/**
 * pages/MFAPage.jsx — Google Authenticator MFA Verification
 */

import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MFAPage = () => {
  const { verifyMFA } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ Fixed: Declare all refs individually — hooks cannot be called inside loops
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[idx] = val.slice(-1);
    setDigits(next);
    setError('');
    if (val && idx < 5) refs[idx + 1].current?.focus();
    if (next.every((d) => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code) => {
    setLoading(true);
    setError('');
    const result = await verifyMFA(code);
    setLoading(false);
    if (result?.success) navigate('/dashboard');
    else {
      setError(result?.error || 'Invalid code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      refs[0].current?.focus();
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        {/* Google Authenticator icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-coastal flex items-center justify-center mx-auto mb-4 shadow-btn">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-primary-600">Two-Factor Authentication</h2>
        <p className="text-primary-400 text-sm mt-2 max-w-xs mx-auto">
          Enter the 6-digit code from your <strong>Google Authenticator</strong> app.
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 
                        bg-surface-50 dark:bg-primary-800 text-primary-700 dark:text-surface-100
                        transition-all duration-150 outline-none
                        ${d ? 'border-primary-400 bg-primary-50' : 'border-surface-300 dark:border-primary-600'}
                        ${error ? 'border-danger-400 bg-danger-50' : ''}
                        focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(51,87,101,0.12)]`}
            disabled={loading}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 mb-4 animate-slide-up">
          <svg className="w-4 h-4 text-danger-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-danger-600 text-sm">{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="spinner" />
          <span className="text-sm text-primary-400">Verifying...</span>
        </div>
      )}

      {/* Resend / Back */}
      <div className="text-center mt-6 space-y-3">
        <p className="text-xs text-primary-300">
          Code refreshes every <span className="font-semibold text-primary-400">30 seconds</span>
        </p>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-primary-400 hover:text-primary-600 transition-colors flex items-center gap-1.5 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default MFAPage;
