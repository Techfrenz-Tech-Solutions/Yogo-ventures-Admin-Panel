/**
 * components/Header.jsx — Top Navigation Header
 * Static (sticky) header, notifications with mark-as-read (tick icon, deletes on click),
 * recent activities fed via RecentActivitiesContext (or prop).
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

// Global recent activities store (module-level so any page can push to it)
export const recentActivities = [];
export const addActivity = (text, type = 'update') => {
  recentActivities.unshift({
    id: Date.now() + Math.random(),
    type,
    text,
    time: 'Just now',
    unread: true,
  });
  if (recentActivities.length > 20) recentActivities.pop();
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'enquiry', text: 'New enquiry from VIP customer', time: '5m ago', unread: true },
  { id: 2, type: 'product', text: 'New product added: Premium Shirt', time: '1h ago', unread: true },
  { id: 3, type: 'order',   text: 'Order DEL-2024-001 completed',   time: '3h ago', unread: false },
  { id: 4, type: 'enquiry', text: 'Enquiry QUO-123 marked as done', time: '4h ago', unread: false },
  { id: 5, type: 'product', text: 'Product SKU-456 updated',        time: '6h ago', unread: false },
];

const Header = ({ onMenuToggle }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Merge recent activities every time the panel opens or new ones arrive
  useEffect(() => {
    const merge = () => {
      if (recentActivities.length > 0) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = recentActivities.filter(a => !existingIds.has(a.id));
          return newOnes.length ? [...newOnes, ...prev] : prev;
        });
      }
    };
    merge();
    // Poll every 2s so notifications appear even if panel stays open
    const timer = setInterval(merge, 2000);
    return () => clearInterval(timer);
  }, [notifOpen]);

  // Also sync new activities into badge count when panel is closed
  useEffect(() => {
    if (notifOpen) return; // panel open = already merging via other effect
    const timer = setInterval(() => {
      if (recentActivities.length > 0) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = recentActivities.filter(a => !existingIds.has(a.id));
          return newOnes.length ? [...newOnes, ...prev] : prev;
        });
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [notifOpen]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Mark as read = delete notification
  const deleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications([]);
  };

  const getIconForType = (type) => {
    const icons = {
      enquiry: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      product: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      order:   'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 7h2v10h-2V7z',
      update:  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    };
    return icons[type] || icons.enquiry;
  };

  const getTypeColor = (type) => {
    const colors = {
      enquiry: 'bg-primary-50 text-primary-500 dark:bg-primary-700 dark:text-primary-200',
      product: 'bg-accent-50 text-accent-500 dark:bg-primary-700 dark:text-accent-300',
      order:   'bg-earth-50 text-earth-500 dark:bg-primary-700 dark:text-earth-300',
      update:  'bg-success-50 text-success-500 dark:bg-primary-700 dark:text-success-300',
    };
    return colors[type] || colors.enquiry;
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <header className="h-16 bg-white border-b border-surface-200
                        flex items-center px-4 gap-3 flex-shrink-0 z-20
                        shadow-[0_1px_8px_rgba(51,87,101,0.06)]">
      {/* Mobile menu toggle */}
      <button onClick={onMenuToggle} className="btn-icon lg:hidden text-primary-500">
        <Icon path="M4 6h16M4 12h16M4 18h16" />
      </button>

      <div className="flex-1 min-w-0" />

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-2 bg-surface-100 rounded-xl px-3 py-2 border border-primary-300 animate-slide-in">
              <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" className="w-4 h-4 text-primary-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, orders..."
                className="bg-transparent text-sm text-primary-700 placeholder-primary-300 outline-none w-52"
                onBlur={() => { setSearchOpen(false); setSearchQuery(''); }}
              />
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="btn-icon text-primary-500">
              <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="btn-icon text-primary-500 relative"
          >
            <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            {unreadCount > 0 && (
              <span className="notification-dot">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <>
              {/* Mobile: full-screen overlay */}
              <div
                className="fixed inset-0 bg-primary-900/40 z-40 sm:hidden"
                onClick={() => setNotifOpen(false)}
              />

              {/* Panel — full-width bottom sheet on mobile, dropdown on desktop */}
              <div className={[
                // shared
                'bg-white shadow-modal border border-surface-100 overflow-hidden animate-slide-up z-50 flex flex-col',
                // mobile: fixed bottom sheet that fills the screen width
                'fixed left-0 right-0 bottom-0 rounded-t-2xl max-h-[75vh]',
                // sm+: absolute dropdown anchored right under bell icon
                'sm:absolute sm:left-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:w-96 sm:rounded-2xl sm:max-h-[70vh]',
              ].join(' ')}>
                {/* Header row */}
                <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between flex-shrink-0">
                  <span className="font-semibold text-primary-600 text-sm">Notifications</span>
                  <div className="flex items-center gap-3">
                    {notifications.length > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-primary-500 hover:text-primary-700 font-medium">
                        Clear all
                      </button>
                    )}
                    {/* Close button — visible on mobile */}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="sm:hidden p-1 rounded-lg text-primary-400 hover:text-primary-600"
                    >
                      <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="divide-y divide-surface-50 overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-primary-300">
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 hover:bg-surface-50 transition-colors ${n.unread ? 'bg-primary-50/50' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${getTypeColor(n.type)}`}>
                          <Icon path={getIconForType(n.type)} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-primary-700">{n.text}</p>
                          <p className="text-xs text-primary-300 mt-1">{n.time}</p>
                        </div>
                        {/* Mark as read = tick icon = deletes notification */}
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="ml-1 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-success-50 text-primary-300 hover:text-success-600 transition-colors"
                          title="Mark as read"
                        >
                          <Icon path="M5 13l4 4L19 7" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-coastal flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {admin?.firstName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-medium text-primary-700 leading-none truncate max-w-[100px]">
                {admin?.firstName || 'Admin'}
              </p>
              <p className="text-[11px] text-primary-300 capitalize mt-0.5">{admin?.role || 'admin'}</p>
            </div>
            <Icon path="M19 9l-7 7-7-7" className="w-3.5 h-3.5 text-primary-300 flex-shrink-0" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-primary-800 rounded-2xl shadow-modal border border-surface-100 dark:border-primary-600 overflow-hidden animate-slide-up z-50">
              <div className="px-4 py-3 border-b border-surface-100">
                <p className="font-semibold text-primary-700 text-sm">{admin?.firstName} {admin?.lastName}</p>
                <p className="text-xs text-primary-300 truncate">{admin?.email}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <Link to="/profile" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-primary-600 hover:bg-surface-50 transition-colors">
                  <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-4 h-4" />
                  Profile Settings
                </Link>
              </div>
              <div className="p-1.5 border-t border-surface-100">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
