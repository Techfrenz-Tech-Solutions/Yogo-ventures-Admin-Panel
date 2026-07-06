/**
 * pages/Dashboard.jsx — Home Dashboard
 * Static stats + chart using recharts — no API calls, loads instantly.
 */

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';

// ─── Static chart data ────────────────────────
const CHART_DATA = {
  monthly: [
    { label: 'Jan', enquiries: 12, orders: 8  },
    { label: 'Feb', enquiries: 18, orders: 11 },
    { label: 'Mar', enquiries: 15, orders: 9  },
    { label: 'Apr', enquiries: 22, orders: 14 },
    { label: 'May', enquiries: 28, orders: 19 },
    { label: 'Jun', enquiries: 24, orders: 16 },
    { label: 'Jul', enquiries: 32, orders: 22 },
  ],
  weekly: [
    { label: 'Wk1', enquiries: 6,  orders: 4  },
    { label: 'Wk2', enquiries: 9,  orders: 6  },
    { label: 'Wk3', enquiries: 7,  orders: 5  },
    { label: 'Wk4', enquiries: 11, orders: 8  },
    { label: 'Wk5', enquiries: 14, orders: 10 },
    { label: 'Wk6', enquiries: 10, orders: 7  },
  ],
  daily: [
    { label: 'Mon', enquiries: 3, orders: 2 },
    { label: 'Tue', enquiries: 5, orders: 3 },
    { label: 'Wed', enquiries: 4, orders: 2 },
    { label: 'Thu', enquiries: 6, orders: 4 },
    { label: 'Fri', enquiries: 8, orders: 5 },
    { label: 'Sat', enquiries: 5, orders: 3 },
    { label: 'Sun', enquiries: 2, orders: 1 },
  ],
  yearly: [
    { label: '2022', enquiries: 180, orders: 120 },
    { label: '2023', enquiries: 240, orders: 165 },
    { label: '2024', enquiries: 310, orders: 210 },
    { label: '2025', enquiries: 280, orders: 190 },
  ],
};

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, icon, color = 'primary', prefix = '', suffix = '' }) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-500',
    accent:  'bg-accent-50  text-accent-500',
    earth:   'bg-earth-50   text-earth-500',
    success: 'bg-success-50 text-success-500',
  };
  return (
    <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
      <div className={`stat-icon ${colorMap[color]}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-primary-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-heading font-bold text-primary-700 mt-0.5">
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value ?? '—'}{suffix}
        </p>
      </div>
    </div>
  );
};

// ─── Period Tabs ──────────────────────────────
const PeriodTabs = ({ value, onChange }) => (
  <div className="flex items-center bg-surface-100 rounded-xl p-0.5 gap-0.5">
    {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
      <button
        key={p}
        onClick={() => onChange(p)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize
          ${value === p
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-primary-400 hover:text-primary-600'}`}
      >
        {p}
      </button>
    ))}
  </div>
);

// ─── Dashboard ────────────────────────────────
const Dashboard = () => {
  const [period, setPeriod] = useState('monthly');
  const now = new Date();

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-primary-400 text-sm mt-0.5">
            {format(now, 'EEEE, MMMM d, yyyy')} · {format(now, 'h:mm a')}
          </p>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Enquiries"
          value={142}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="primary"
        />
        <StatCard
          label="Pending Enquiries"
          value={38}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="earth"
        />
        <StatCard
          label="Completed Enquiries"
          value={104}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="success"
        />
      </div>

      {/* ── Enquiry Overview Chart ── */}
      <div className="card w-full">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="font-heading font-semibold text-primary-600">Enquiry Overview</h3>
            <p className="text-xs text-primary-400 mt-0.5">Enquiry and order trends</p>
          </div>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={CHART_DATA[period]}
            barSize={16}
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBE2DC" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#74A8A4' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#74A8A4' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #DBE2DC', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="enquiries" name="Enquiries" fill="#335765" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders"    name="Orders"    fill="#B6D9E0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Country Master',      href: '/country-master',       icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'primary' },
          { label: 'Category Master',     href: '/category-master',      icon: 'M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z', color: 'accent' },
          { label: 'Sub Category Master', href: '/sub-category-master',  icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z', color: 'earth' },
          { label: 'Contact Enquiries',   href: '/contact-enquiries',    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'success' },
        ].map(({ label, href, icon, color }) => {
          const colorMap = {
            primary: 'bg-primary-50 text-primary-500 hover:bg-primary-100',
            accent:  'bg-accent-50  text-accent-500  hover:bg-accent-100',
            earth:   'bg-earth-50   text-earth-500   hover:bg-earth-100',
            success: 'bg-success-50 text-success-500 hover:bg-success-100',
          };
          return (
            <a
              key={label}
              href={href}
              className={`card flex items-center gap-3 transition-all hover:shadow-card-hover cursor-pointer ${colorMap[color]}`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-sm font-medium">{label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
