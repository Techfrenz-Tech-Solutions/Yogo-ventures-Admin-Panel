/**
 * components/charts/index.jsx — Recharts Wrappers
 * ─────────────────────────────────────────────
 * BarChart, LineChart, PieChart — all styled with
 * the Coastal Retreat design palette.
 */

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── Palette ──────────────────────────────────
const COLORS = ['#335765', '#74A8A4', '#B6D9E0', '#7F543D', '#DBE2DC', '#4d8f8c'];

// ─── Custom Tooltip ───────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-primary-800 border border-surface-200 dark:border-primary-600 rounded-xl shadow-card px-3 py-2.5 text-xs font-body">
      {label && <p className="text-surface-400 mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-primary-700 dark:text-surface-200">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span>{entry.name}: </span>
          <span className="font-semibold">{prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
};

// ─── AdminBarChart ────────────────────────────
export const AdminBarChart = ({
  data = [],
  bars = [{ key: 'value', name: 'Value' }],
  xKey = 'label',
  height = 280,
  prefix = '',
  suffix = '',
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#DBE2DC" vertical={false} />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#8da290' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 11, fill: '#8da290' }} axisLine={false} tickLine={false} width={45} />
      <Tooltip content={<CustomTooltip prefix={prefix} suffix={suffix} />} cursor={{ fill: '#335765', fillOpacity: 0.05 }} />
      {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {bars.map((b, i) => (
        <Bar
          key={b.key}
          dataKey={b.key}
          name={b.name}
          fill={COLORS[i % COLORS.length]}
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

// ─── AdminLineChart ───────────────────────────
export const AdminLineChart = ({
  data = [],
  lines = [{ key: 'value', name: 'Value' }],
  xKey = 'label',
  height = 280,
  prefix = '',
  suffix = '',
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#DBE2DC" vertical={false} />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#8da290' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 11, fill: '#8da290' }} axisLine={false} tickLine={false} width={45} />
      <Tooltip content={<CustomTooltip prefix={prefix} suffix={suffix} />} />
      {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {lines.map((l, i) => (
        <Line
          key={l.key}
          type="monotone"
          dataKey={l.key}
          name={l.name}
          stroke={COLORS[i % COLORS.length]}
          strokeWidth={2.5}
          dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

// ─── AdminPieChart ────────────────────────────
export const AdminPieChart = ({
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  height = 260,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius="55%"
        outerRadius="80%"
        dataKey={valueKey}
        nameKey={nameKey}
        paddingAngle={3}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        labelLine={{ strokeWidth: 1, stroke: '#8da290' }}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(v) => v.toLocaleString()} />
    </PieChart>
  </ResponsiveContainer>
);
