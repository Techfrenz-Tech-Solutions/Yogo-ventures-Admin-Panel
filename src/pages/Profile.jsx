/**
 * pages/Profile.jsx — Admin Profile
 * ─────────────────────────────────
 * Branding block only — name/avatar are the shared YoGo Ventures identity,
 * not a personal account, so there's no personal-info/password/MFA editing.
 *
 * Account fields (email/role) come from the logged-in session (AuthContext),
 * not a GET /profile call — the backend has no /profile route at all, so
 * that call would just 404 forever.
 */

import { useAuth } from '../context/AuthContext';
import logo from '../Assets/Image/Logo1-white.png';

const Profile = () => {
  const { admin } = useAuth();

  return (
    <div className="page-container max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Profile</h1>
          <p className="text-primary-400 text-sm mt-0.5">Account details</p>
        </div>
      </div>

      {/* ─── Avatar & Name ──────────────────── */}
      <div className="card flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-coastal flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src={logo} alt="YoGo Ventures" className="w-full h-full object-contain p-3" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-primary-700">YoGo Ventures</h2>
          <p className="text-primary-400 text-sm">{admin?.email_id}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge-info capitalize">{admin?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
