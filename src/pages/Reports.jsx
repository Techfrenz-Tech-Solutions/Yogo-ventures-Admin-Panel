/**
 * pages/Reports.jsx — Analytics & Reports
 * Mirrors the Dashboard: same 3 stat cards, bar chart, recent enquiries table.
 * Also includes period/chart-type toggles and PDF/Excel export.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#335765', '#74A8A4', '#B6D9E0', '#7F543D', '#DBE2DC', '#4d8f8c'];

// ─── Stat Card (same as Dashboard) ────────────
const StatCard = ({ label, value, icon, change, color = 'primary', prefix = '' }) => {
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
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value ?? '—'}
        </p>
        {change !== undefined && (
          <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${change >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
            </svg>
            {Math.abs(change)}% vs last month
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-100 px-3 py-2 text-xs">
      <p className="font-medium text-primary-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-primary-400">{p.name}:</span>
          <span className="font-medium text-primary-700">
            {p.name === 'revenue' ? `₹${p.value?.toLocaleString()}` : p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const formatLabel = (d, period) => {
  if (!d._id) return '';
  if (period === 'daily')   return `${d._id.day}/${d._id.month}`;
  if (period === 'weekly')  return `W${d._id.week}`;
  if (period === 'monthly') {
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (m[d._id.month - 1] || '') + ' ' + String(d._id.year).slice(2);
  }
  if (period === 'yearly') return String(d._id.year);
  return '';
};

// ─── Main Component ───────────────────────────
const Reports = () => {
  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, salesRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getSalesChart(period),
      ]);
      setStats(dashRes.data.data);
      const raw = salesRes.data?.data || [];
      setSalesData(raw.map((d) => ({ ...d, label: formatLabel(d, period) })));
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Export PDF ───────────────────────────
  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor('#335765');
      doc.text('Sales & Analytics Report', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor('#666');
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${period}`, 14, 26);
      doc.autoTable({
        startY: 34,
        head: [['Period', 'Orders', 'Revenue (₹)']],
        body: salesData.map((d) => [d.label, d.orders, `₹${(d.revenue || 0).toLocaleString()}`]),
        headStyles: { fillColor: [51, 87, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 246, 248] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
      doc.save(`analytics-report-${period}.pdf`);
      toast.success('PDF report downloaded.');
    } catch { toast.error('PDF export failed.'); }
  };

  // ─── Export Excel ─────────────────────────
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        salesData.map((d) => ({ Period: d.label, Orders: d.orders, Revenue: d.revenue || 0 }))
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
      XLSX.writeFile(wb, `analytics-${period}.xlsx`);
      toast.success('Excel exported.');
    } catch { toast.error('Excel export failed.'); }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-primary-400 text-sm mt-0.5">Sales performance and business insights</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-primary-400 mb-1">From Date</label>
              <input type="date" className="form-input" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-primary-400 mb-1">To Date</label>
              <input type="date" className="form-input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel} className="btn-outline btn-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Excel
            </button>
            <button onClick={exportPDF} className="btn-primary btn-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* ── Same 3 stat cards as Dashboard ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Quote Enquiries"
          value={stats?.['Total Quote Enquires']}
          change={stats?.orderGrowth}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="primary"
        />
        <StatCard
          label="Total Products"
          value={stats?.totalProducts}
          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          color="earth"
        />
        <StatCard
          label="Total Categories"
          value={stats?.['Total Categories']}
          icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          color="success"
        />
      </div>

      {/* Chart Controls */}
      <div className="card flex flex-wrap items-center gap-4 !py-3">
        <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
          {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                ${period === p ? 'bg-primary-500 text-white shadow' : 'text-primary-400 hover:text-primary-600'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
          {[{ key: 'bar', label: 'Bar' }, { key: 'line', label: 'Line' }].map((t) => (
            <button key={t.key} onClick={() => setChartType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${chartType === t.key ? 'bg-primary-500 text-white shadow' : 'text-primary-400 hover:text-primary-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bar/Line Chart — full width (same as Dashboard) ── */}
      <div className="card w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading font-semibold text-primary-600">Enquiry Overview</h3>
            <p className="text-xs text-primary-400 mt-0.5">Revenue and order trends</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"/><span className="ml-3 text-primary-400 text-sm">Loading chart...</span>
          </div>
        ) : salesData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-primary-300 text-sm">No sales data for this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartType === 'bar' ? (
              <BarChart data={salesData} barSize={16} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBE2DC" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#74A8A4' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#74A8A4' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue (₹)" fill="#335765" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" name="Orders" fill="#B6D9E0" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={salesData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DBE2DC" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#74A8A4' }} />
                <YAxis tick={{ fontSize: 11, fill: '#74A8A4' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#335765" strokeWidth={2.5} dot={{ r: 4, fill: '#335765' }} name="Revenue (₹)" />
                <Line type="monotone" dataKey="orders" stroke="#B6D9E0" strokeWidth={2.5} dot={{ r: 4, fill: '#B6D9E0' }} name="Orders" />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
        {/* Pie chart — kept commented as per original */}
        {/* <PieChart> … </PieChart> */}
      </div>

      {/* ── Recent Enquiries By Activity — same as Dashboard ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-primary-600">Recent Enquiries By Activity</h3>
          <a href="/enquiries" className="text-xs text-primary-400 hover:text-primary-600 font-medium transition-colors">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentOrders || []).map((order) => (
                <tr key={order._id}>
                  <td className="font-mono text-xs text-primary-500">{order.orderNumber}</td>
                  <td className="font-medium">{order.customerName}</td>
                  <td className="font-mono">₹{order.totalAmount?.toLocaleString('en-IN')}</td>
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
                <tr><td colSpan={5} className="text-center py-8 text-primary-300">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
