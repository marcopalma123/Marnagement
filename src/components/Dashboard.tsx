'use client';

import { useState, useEffect } from 'react';
import { WorkDay, Invoice, Settings } from '@/types';
import { getWorkDays, getInvoices, getSettings, getWorkDaysRemote, getInvoicesRemote, getSettingsRemote } from '@/lib/store';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Calendar, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    async function loadData() {
      const [wd, inv, s] = await Promise.all([
        getWorkDaysRemote(),
        getInvoicesRemote(),
        getSettingsRemote()
      ]);
      setWorkDays(wd);
      setInvoices(inv);
      setSettings(s || null);
    }
    loadData();
  }, []);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthStr = format(now, 'yyyy-MM');

  const thisMonthDays = workDays.filter((d) => d.date.startsWith(monthStr) && d.isBusinessDay);
  const daysWorked = thisMonthDays.length;
  const totalHours = thisMonthDays.reduce((sum, d) => sum + d.hoursWorked, 0);
  const monthRevenue = daysWorked * (settings?.dailyRate || 0);

  const thisMonthInvoices = invoices.filter((i) => i.month === monthStr);
  const paidInvoices = thisMonthInvoices.filter((i) => i.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.total, 0);
  const outstanding = thisMonthInvoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0);

  // Chart data: days worked per week this month
  const weeks: { name: string; days: number; revenue: number }[] = [];
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  let weekIdx = 0;
  let weekDays = 0;
  allDays.forEach((day, i) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isWorked = thisMonthDays.some((d) => d.date === dateStr);
    if (isWorked) weekDays++;
    if (day.getDay() === 0 || i === allDays.length - 1) {
      weeks.push({
        name: `W${weekIdx + 1}`,
        days: weekDays,
        revenue: weekDays * (settings?.dailyRate || 0),
      });
      weekIdx++;
      weekDays = 0;
    }
  });

  // Invoice status pie
  const statusData = [
    { name: 'Paid', value: invoices.filter((i) => i.status === 'paid').length, color: '#10b981' },
    { name: 'Sent', value: invoices.filter((i) => i.status === 'sent').length, color: '#3b82f6' },
    { name: 'Overdue', value: invoices.filter((i) => i.status === 'overdue').length, color: '#ef4444' },
    { name: 'Draft', value: invoices.filter((i) => i.status === 'draft').length, color: '#9ca3af' },
  ].filter((d) => d.value > 0);

  const symbol = settings?.currencies?.find((c) => c.code === settings.defaultCurrency)?.symbol || '€';

  const stats = [
    { label: 'Days Worked', value: daysWorked, icon: <Calendar size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Hours Logged', value: totalHours.toFixed(1), icon: <Clock size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Month Revenue', value: `${symbol}${monthRevenue.toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Outstanding', value: `${symbol}${outstanding.toLocaleString()}`, icon: <DollarSign size={20} />, color: outstanding > 0 ? 'text-red-600' : 'text-gray-600', bg: outstanding > 0 ? 'bg-red-50' : 'bg-gray-50' },
  ];

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="text-sm text-gray-400 mt-1">{format(now, 'EEEE, MMMM d, yyyy')}</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 card-hover">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-semibold mt-3 tabular-nums">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeks}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Invoice Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-300 text-sm">
              No invoices yet
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Recent Work Days</h3>
        {thisMonthDays.length > 0 ? (
          <div className="space-y-2">
            {thisMonthDays.slice(-5).reverse().map((day) => (
              <div key={day.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium">{format(parseISO(day.date), 'EEE, MMM d')}</p>
                  <p className="text-xs text-gray-400">{day.notes || 'No notes'}</p>
                </div>
                <span className="text-sm font-mono text-gray-500">{day.hoursWorked}h</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300 text-center py-8">
            No work days logged this month. Head to Calendar to get started.
          </p>
        )}
      </div>
    </div>
  );
}
