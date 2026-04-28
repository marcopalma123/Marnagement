'use client';

import { NavigationItem } from '@/types';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  PenTool,
  Receipt,
  Calculator,
  Settings,
  CheckSquare,
  MessageCircle,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  active: NavigationItem;
  onNavigate: (item: NavigationItem) => void;
  userLabel?: string;
  onLogout?: () => void;
}

const navItems: { id: NavigationItem; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  { id: 'projects', label: 'Projects', icon: <CheckSquare size={18} /> },
  { id: 'meetings', label: 'Meetings', icon: <FileText size={18} /> },
  { id: 'editor', label: 'Editor', icon: <PenTool size={18} /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={18} /> },
  { id: 'taxCalculator', label: 'Tax Calculator', icon: <Calculator size={18} /> },
  { id: 'telegram', label: 'Telegram', icon: <MessageCircle size={18} /> },
  { id: 'triggers', label: 'Triggers', icon: <Zap size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export default function Sidebar({ active, onNavigate, userLabel, onLogout }: SidebarProps) {
  return (
    <aside className="w-60 border-r border-gray-200 bg-gray-50/50 flex flex-col h-screen">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold tracking-tight">
          <span className="text-gray-900">marnage</span>
          <span className="text-blue-600">ment</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Time & Finance</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active === item.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <p className="text-xs text-gray-500 truncate text-center">{userLabel || 'Signed in'}</p>
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
        <p className="text-[10px] text-gray-300 text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
