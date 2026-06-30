/**
 * pages/Dashboard.jsx — Home Dashboard
 */

import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#335765', '#74A8A4', '#B6D9E0', '#7F543D', '#DBE2DC'];

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, icon, change, color = 'primary', prefix = '', suffix = '' }) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-500',
    accent:  'bg-accent-50 text-accent-500',
    earth:   'bg-earth-50 text-earth-500',
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
        {change !== undefined && (
          <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${change >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
            </svg>
            {Math.abs(change)}% vs last month
          </p>
        )}
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
          ${value === p ? 'bg-white text-primary-600 shadow-sm' : 'text-primary-400 hover:text-primary-600'}`}
      >
        {p}
      </button>
    ))}
  </div>
);

// ─── Dashboard ────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const now = new Date();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, salesRes] = await Promise.all([
          analyticsAPI.getDashboard(),
          analyticsAPI.getSalesChart(period),
        ]);
        setStats(dashRes.data.data);
        setSalesData(salesRes.data.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [period]);

  const chartData = salesData.map((d) => ({
    label: d._id.month ? `${d._id.year}/${String(d._id.month).padStart(2,'0')}` :
           d._id.day   ? `${d._id.month}/${d._id.day}` :
           d._id.week  ? `Wk${d._id.week}` : String(d._id.year),
    revenue: d.revenue || 0,
    orders:  d.orders  || 0,
  }));

  if (loading) return (
    <div className="page-container">
      {/* 3-column skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-surface-100" />
        ))}
      </div>
    </div>
  );

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
        <div className="flex gap-2">
          <button className="btn-outline btn-sm gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export PDF
          </button>
          <button className="btn-secondary btn-sm gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* ── KPI Cards — Dashboard Stats — 3 cards filling the full row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Products"
          value={stats?.totalProducts}
          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          color="primary"
        />
        <StatCard
          label="Total Enquiries"
          value={stats?.['Total Quote Enquires']}
          change={stats?.orderGrowth}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="earth"
        />
        <StatCard
          label="Completed Enquiries"
          value={stats?.['Total Categories']}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="success"
        />
      </div>

      {/* ── Charts Row — Enquiry Overview ── */}
      <div className="card w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading font-semibold text-primary-600">Enquiry Overview</h3>
            <p className="text-xs text-primary-400 mt-0.5">Enquiry and order trends</p>
          </div>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barSize={16} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBE2DC" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#74A8A4' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#74A8A4' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DBE2DC', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name="Enquiries" fill="#335765" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders" name="Orders" fill="#B6D9E0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Enquiries */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-primary-600">Recent Enquiries</h3>
          <a href="/enquiries" className="text-xs text-primary-400 hover:text-primary-600 font-medium transition-colors">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Enquiry #</th><th>Customer</th><th>Enquiry Type</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentOrders || []).map((order) => (
                <tr key={order._id}>
                  <td className="font-mono text-xs text-primary-500">{order.orderNumber}</td>
                  <td className="font-medium">{order.customerName}</td>
                  <td className="font-medium">{order.productName || 'General Enquiry'}</td>
                  <td>
                    <span className={`badge ${
                      order.status === 'delivered' ? 'badge-success' :
                      order.status === 'pending'   ? 'badge-warning' :
                      order.status === 'cancelled' ? 'badge-danger'  : 'badge-info'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="text-primary-400 text-xs">{format(new Date(order.createdAt), 'dd MMM yyyy')}</td>
                </tr>
              ))}
              {!stats?.recentOrders?.length && (
                <tr><td colSpan={5} className="text-center py-8 text-primary-300">No recent enquiries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
