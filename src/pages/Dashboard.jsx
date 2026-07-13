/**
 * pages/Dashboard.jsx — Home Dashboard
 * Real data from the backend — no mocked stats or chart data.
 *
 * GET /dashboard/dashboard-stats             → { total, pending, completed }
 * GET /dashboard/dashboard-monthly-enquiries → [{ month, general, contact, quote, sample }, ...]
 * GET /dashboard/dashboard-latest-enquiries  → { general: [...2], contact: [...2], quote: [...2] }
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import Api from '../utils/Api';

// ─── Stat Card ────────────────────────────────
const StatCard = ({ label, value, icon, color = 'primary', loading }) => {
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
          {loading ? <span className="inline-block w-10 h-6 bg-surface-100 rounded animate-pulse" /> : (value ?? 0).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
};

// ─── Enquiry preview card ──────────────────────
const ENQUIRY_ICON = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';

const fmtDate = (d) => {
  if (!d) return '—';
  const parsed = new Date(d);
  return isNaN(parsed) ? '—' : format(parsed, 'dd MMM yyyy, hh:mm a');
};

const EnquiryPreviewCard = ({ title, listHref, records, loading, getEnquiryId, getName, getEmail, getDate, onOpen }) => (
  <div className="card !p-0 overflow-hidden flex flex-col">
    <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
      <h3 className="font-heading text-sm font-semibold text-primary-600">{title}</h3>
      <a href={listHref} className="text-xs text-primary-500 hover:text-primary-700 font-medium">View all</a>
    </div>
    <div className="divide-y divide-surface-50 flex-1">
      {loading ? (
        <div className="px-4 py-6 flex items-center justify-center">
          <div className="spinner !w-5 !h-5" />
        </div>
      ) : records.length === 0 ? (
        <div className="px-4 py-8 text-center text-primary-300">
          <p className="text-sm">No recent {title.toLowerCase()}.</p>
        </div>
      ) : records.map((r) => (
        <button
          key={r.id}
          onClick={() => onOpen(r.id)}
          className="w-full text-left px-4 py-3 hover:bg-surface-50 transition-colors flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={ENQUIRY_ICON} />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 text-[11px] font-mono font-medium">
                {getEnquiryId(r) || '—'}
              </span>
              <span className="text-sm font-medium text-primary-700 truncate">{getName(r) || 'Unknown'}</span>
            </div>
            <p className="text-xs text-primary-400 mt-0.5 truncate">{getEmail(r) || '—'}</p>
            <p className="text-[11px] text-primary-300 mt-0.5">{fmtDate(getDate(r))}</p>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const now = new Date();

  const [stats,   setStats]   = useState({ total: 0, pending: 0, completed: 0 });
  const [monthly, setMonthly] = useState([]);
  const [latest,  setLatest]  = useState({ general: [], contact: [], quote: [] });
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [latestLoading,  setLatestLoading]  = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await Api.get('/dashboard/dashboard-stats');
      setStats(res.data?.data || { total: 0, pending: 0, completed: 0 });
    } catch {
      // Keep last-known values on failure — stat cards just stay stale, not broken.
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const res = await Api.get('/dashboard/dashboard-monthly-enquiries');
      setMonthly(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setMonthly([]);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    setLatestLoading(true);
    try {
      const res = await Api.get('/dashboard/dashboard-latest-enquiries');
      setLatest(res.data?.data || { general: [], contact: [], quote: [] });
    } catch {
      setLatest({ general: [], contact: [], quote: [] });
    } finally {
      setLatestLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchMonthly(); fetchLatest(); }, [fetchStats, fetchMonthly, fetchLatest]);

  const openEnquiry = (path) => (id) => navigate(`${path}?highlight=${id}`);

  const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim();

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
          value={stats.total}
          loading={statsLoading}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="primary"
        />
        <StatCard
          label="Pending Enquiries"
          value={stats.pending}
          loading={statsLoading}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="earth"
        />
        <StatCard
          label="Completed Enquiries"
          value={stats.completed}
          loading={statsLoading}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="success"
        />
      </div>

      {/* ── Enquiry Overview Chart ── */}
      <div className="card w-full">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="font-heading font-semibold text-primary-600">Enquiry Overview</h3>
            <p className="text-xs text-primary-400 mt-0.5">Enquiries received per month, by type (last 6 months)</p>
          </div>
        </div>
        {monthlyLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="spinner !w-6 !h-6" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={monthly}
              barSize={12}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBE2DC" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#74A8A4' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#74A8A4' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #DBE2DC', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="general" name="General Enquiries" fill="#335765" radius={[4, 4, 0, 0]} />
              <Bar dataKey="contact" name="Contact Enquiries" fill="#B6D9E0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quote"   name="Quote Enquiries"   fill="#E0A458" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sample"  name="Sample Enquiries"  fill="#7BA88A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
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

      {/* ── Latest Enquiry Previews ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EnquiryPreviewCard
          title="General Enquiries"
          listHref="/general-enquiries"
          records={latest.general}
          loading={latestLoading}
          getEnquiryId={(r) => r.reference_number}
          getName={fullName}
          getEmail={(r) => r.email_id}
          getDate={(r) => r.created_date}
          onOpen={openEnquiry('/general-enquiries')}
        />
        <EnquiryPreviewCard
          title="Contact Enquiries"
          listHref="/contact-enquiries"
          records={latest.contact}
          loading={latestLoading}
          getEnquiryId={(r) => r.reference_number}
          getName={fullName}
          getEmail={(r) => r.email_id}
          getDate={(r) => r.created_date}
          onOpen={openEnquiry('/contact-enquiries')}
        />
        <EnquiryPreviewCard
          title="Quote Enquiries"
          listHref="/quote-enquiries"
          records={latest.quote}
          loading={latestLoading}
          getEnquiryId={(r) => r.reference_number}
          getName={fullName}
          getEmail={(r) => r.email_id}
          getDate={(r) => r.created_date}
          onOpen={openEnquiry('/quote-enquiries')}
        />
      </div>
    </div>
  );
};

export default Dashboard;
