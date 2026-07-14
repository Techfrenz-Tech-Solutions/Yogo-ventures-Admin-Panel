/**
 * components/Sidebar.jsx — Main Navigation Sidebar
 * Country Master added above Category Master.
 * Mobile: clicking a menu item closes the sidebar immediately.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from "../Assets/Image/Logo1-white.png";

const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ICONS = {
  dashboard:       'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  countryMaster:   'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  categoryMaster:  'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  subCategory:     'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  productMaster:   'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  quoteEnquiry:    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  contactEnquiry:  'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  bestSelling:     'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  newArrivals:     'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  enquiries:       'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  customerMaster:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  sampleEnquiry:   'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12m-4-4h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  orderStatus:     'M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  orderTracking:   'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 7h2v10h-2V7z',
  settings:        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  logout:          'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronLeft:     'M15 19l-7-7 7-7',
  chevronRight:    'M9 5l7 7-7 7',
};

const NAV_ITEMS = [
  { label: 'Dashboard',              path: '/dashboard',           icon: 'dashboard'      },
  { label: 'Country Master',         path: '/country-master',      icon: 'countryMaster'  },
  { label: 'Category Master',        path: '/category-master',     icon: 'categoryMaster' },
  { label: 'Sub Category Master',    path: '/sub-category-master', icon: 'subCategory'    },
  { label: 'Product Master',         path: '/product-master',      icon: 'productMaster'  },
  { label: 'Get Quote Enquiries',    path: '/quote-enquiries',     icon: 'quoteEnquiry'   },
  { label: 'Contact Us Enquiries',   path: '/contact-enquiries',   icon: 'contactEnquiry' },
  { label: 'Best Selling Products',  path: '/best-selling',        icon: 'bestSelling'    },
  { label: 'New Arrivals',           path: '/new-arrivals',        icon: 'newArrivals'    },
  { label: 'Enquiries',              path: '/general-enquiries',   icon: 'enquiries'      },
  { label: 'Customer Master',        path: '/customer-master',     icon: 'customerMaster' },
  { label: 'Sample Enquiries',       path: '/sample-enquiries',    icon: 'sampleEnquiry'  },
  { label: 'Order Tracking',         path: '/order-tracking',      icon: 'orderTracking'  },
  { label: 'Order Status Master',    path: '/order-status-master', icon: 'orderStatus'    },
  { label: 'Site Settings',          path: '/settings',            icon: 'settings'       },
];

const SidebarInner = ({ collapsed, onCollapse, admin, onLogout, onClose }) => (
  <div className="flex flex-col h-full w-full overflow-hidden">
    {/* Brand */}
    <div className={`flex items-center h-16 flex-shrink-0 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'}`}>
      {collapsed ? (
        <img src={logo} alt="YoGo Ventures Logo" className="w-10 h-10 object-contain" />
      ) : (
        <>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center space-x-2">
              <img src={logo} alt="YoGo Ventures Logo" className="w-10 h-10 object-contain" />
              <span className="font-heading text-white font-semibold text-base truncate">YoGo Ventures</span>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
              <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
            </button>
          )}
          {onCollapse && !collapsed && (
            <button onClick={onCollapse} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0">
              <Icon path={ICONS.chevronLeft} className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
    {onCollapse && collapsed && (
      <button onClick={onCollapse} className="mx-auto mt-3 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
        <Icon path={ICONS.chevronRight} className="w-4 h-4" />
      </button>
    )}

    {/* Nav */}
    <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-2 space-y-0.5">
      {!collapsed && <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium px-4 mb-2">Navigation</p>}
      {NAV_ITEMS.map(({ label, path, icon }) => (
        <NavLink
          key={path}
          to={path}
          title={collapsed ? label : undefined}
          onClick={onClose}
          className={({ isActive }) =>
            `group relative sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center !px-0' : ''}`
          }
        >
          <Icon path={ICONS[icon]} className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {label}
            </div>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Bottom */}
    <div className="flex-shrink-0 border-t border-white/10 p-3 space-y-1">
      <button
        onClick={onLogout}
        title={collapsed ? 'Logout' : undefined}
        className={`group relative sidebar-item w-full text-left !text-red-300 hover:!text-red-200 hover:!bg-red-500/20 ${collapsed ? 'justify-center !px-0' : ''}`}
      >
        <Icon path={ICONS.logout} className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Logout</span>}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Logout
          </div>
        )}
      </button>
    </div>
  </div>
);

const Sidebar = ({ collapsed, onCollapse, mobileOpen, onMobileClose }) => {
  const { logout, admin } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <>
      <aside
        className={`sidebar hidden lg:flex ${collapsed ? 'w-[68px]' : 'w-[260px]'}`}
        style={{ boxShadow: '4px 0 24px rgba(18,37,48,0.15)' }}
      >
        <SidebarInner collapsed={collapsed} onCollapse={onCollapse} admin={admin} onLogout={handleLogout} onClose={null} />
      </aside>
      <aside className={`sidebar lg:hidden w-[260px] z-40 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarInner collapsed={false} onCollapse={null} admin={admin} onLogout={handleLogout} onClose={onMobileClose} />
      </aside>
    </>
  );
};

export default Sidebar;
