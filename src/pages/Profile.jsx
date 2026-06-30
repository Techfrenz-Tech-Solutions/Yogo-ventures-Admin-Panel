/**
 * pages/Profile.jsx — Admin Profile Management
 * ─────────────────────────────────────────────
 * Sections: Personal Info, Change Password, MFA Setup
 */

import { useState, useEffect, useRef } from 'react';
import { profileAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { admin, updateAdmin } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  // MFA
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const avatarInputRef = useRef();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await profileAPI.get();
        setProfile(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  // ─── Update Profile ───────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await profileAPI.update({
        firstName: profile.firstName,
        lastName: profile.lastName,
        contact: profile.contact,
        location: profile.location,
        preferences: profile.preferences,
      });
      updateAdmin(data.data);
      toast.success('Profile updated successfully.');
    } catch {}
    finally { setSavingProfile(false); }
  };

  // ─── Upload Avatar ────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB.');
      return;
    }

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const { data } = await profileAPI.uploadAvatar(formData);
      setProfile((p) => ({ ...p, avatar: data.avatar }));
      updateAdmin({ avatar: data.avatar });
      toast.success('Avatar updated.');
    } catch {}
    finally { setAvatarUploading(false); }
  };

  // ─── Change Password ──────────────────────
  const validatePassword = () => {
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Required';
    if (!passwordForm.newPassword) errs.newPassword = 'Required';
    else if (passwordForm.newPassword.length < 8) errs.newPassword = 'At least 8 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleChangePassword = async () => {
    const errs = validatePassword();
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }
    setPasswordErrors({});
    setSavingPassword(true);
    try {
      await profileAPI.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed. Please log in again.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {}
    finally { setSavingPassword(false); }
  };

  // ─── Setup MFA ────────────────────────────
  const handleSetupMFA = async () => {
    setMfaLoading(true);
    try {
      const { data } = await authAPI.setupMFA();
      setMfaQR(data.qrCode);
      setMfaSecret(data.secret);
    } catch {}
    finally { setMfaLoading(false); }
  };

  const handleConfirmMFA = async () => {
    if (!mfaToken || mfaToken.length !== 6) { toast.error('Enter a 6-digit code.'); return; }
    setMfaLoading(true);
    try {
      await authAPI.confirmMFASetup({ token: mfaToken });
      toast.success('MFA enabled! Your account is now more secure.');
      setProfile((p) => ({ ...p, mfaEnabled: true }));
      updateAdmin({ mfaEnabled: true });
      setMfaQR(null);
      setMfaToken('');
    } catch {}
    finally { setMfaLoading(false); }
  };

  if (loading) return (
    <div className="page-container flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page-container max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Profile</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage your account and security settings</p>
        </div>
      </div>

      {/* ─── Avatar & Name ──────────────────── */}
      <div className="card flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-coastal flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile?.firstName?.[0] || 'A').toUpperCase()
            )}
          </div>
          {avatarUploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
              <div className="spinner !border-white/30 !border-t-white" />
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 shadow-md"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-primary-700">{profile?.firstName} {profile?.lastName}</h2>
          <p className="text-primary-400 text-sm">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge-info capitalize">{profile?.role}</span>
            {profile?.mfaEnabled && <span className="badge-success">MFA Enabled</span>}
          </div>
        </div>
      </div>

      {/* ─── Personal Information ────────────── */}
      <div className="card">
        <h3 className="font-heading text-lg font-semibold text-primary-600 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input className="form-input" value={profile?.firstName || ''} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" value={profile?.lastName || ''} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input bg-surface-50" value={profile?.email || ''} readOnly />
            <p className="text-xs text-primary-400 mt-1">Contact support to change email.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input className="form-input" value={profile?.contact || ''} onChange={(e) => setProfile((p) => ({ ...p, contact: e.target.value }))} placeholder="+91 98765 43210" />
          </div>
          <div className="form-group sm:col-span-2">
            <label className="form-label">Location / City</label>
            <input className="form-input" value={profile?.location || ''} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} placeholder="Mumbai, India" />
          </div>
        </div>

        {/* Preferences */}
        <div className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Preferred Currency</label>
            <select className="form-select" value={profile?.preferences?.currency || 'INR'} onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...p.preferences, currency: e.target.value } }))}>
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
            {savingProfile ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ─── Change Password ─────────────────── */}
      <div className="card">
        <h3 className="font-heading text-lg font-semibold text-primary-600 mb-4">Change Password</h3>
        <div className="space-y-3 max-w-md">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword', label: 'New Password' },
            { key: 'confirmPassword', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>
              <input
                type="password"
                className={`form-input ${passwordErrors[key] ? 'form-input-error' : ''}`}
                value={passwordForm[key]}
                onChange={(e) => setPasswordForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordErrors[key] && <p className="form-error">{passwordErrors[key]}</p>}
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={savingPassword} className="btn-outline">
            {savingPassword ? <><div className="spinner !w-4 !h-4" />Updating...</> : 'Update Password'}
          </button>
        </div>
      </div>

      {/* ─── MFA Setup ───────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-primary-600">Two-Factor Authentication</h3>
            <p className="text-primary-400 text-sm mt-0.5">Secure your account with Google Authenticator.</p>
          </div>
          {profile?.mfaEnabled ? (
            <span className="badge-success text-sm">Active</span>
          ) : (
            <span className="badge-warning text-sm">Not Enabled</span>
          )}
        </div>

        {!profile?.mfaEnabled && !mfaQR && (
          <button onClick={handleSetupMFA} disabled={mfaLoading} className="btn-primary">
            {mfaLoading ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Loading...</> : '🔐 Enable MFA'}
          </button>
        )}

        {mfaQR && (
          <div className="space-y-4 max-w-sm">
            <div className="bg-surface-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-primary-500 mb-3">Scan with Google Authenticator:</p>
              <img src={mfaQR} alt="MFA QR Code" className="mx-auto w-48 h-48 rounded-xl" />
            </div>
            <div className="bg-surface-50 rounded-xl p-3">
              <p className="text-xs text-primary-400 mb-1">Or enter manually:</p>
              <code className="text-primary-600 font-mono text-sm break-all">{mfaSecret}</code>
            </div>
            <div className="form-group">
              <label className="form-label">Enter 6-digit verification code</label>
              <input
                className="form-input font-mono text-center text-lg tracking-widest"
                maxLength={6}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirmMFA} disabled={mfaLoading || mfaToken.length !== 6} className="btn-primary flex-1">
                {mfaLoading ? <><div className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />Verifying...</> : 'Confirm & Enable MFA'}
              </button>
              <button onClick={() => { setMfaQR(null); setMfaToken(''); }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {profile?.mfaEnabled && (
          <div className="bg-success-50 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            <div>
              <p className="text-success-700 font-medium text-sm">MFA is active on your account.</p>
              <p className="text-success-600 text-xs mt-0.5">You'll need your Google Authenticator app each time you log in.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
