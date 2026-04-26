'use client';

import { useState, useEffect, useCallback } from 'react';
import { NavigationItem } from '@/types';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Calendar from '@/components/Calendar';
import Projects from '@/components/Projects';
import Meetings from '@/components/Meetings';
import Editor from '@/components/Editor';
import Invoices from '@/components/Invoices';
import SettingsPage from '@/components/Settings';
import TelegramMessage from '@/components/TelegramMessage';
import Triggers from '@/components/Triggers';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CheckSquare,
  Receipt,
  Settings,
  FileText,
  PenTool,
  MessageCircle,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';

type NavConfig = {
  id: NavigationItem;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarIcon size={18} /> },
  { id: 'projects', label: 'Projects', icon: <CheckSquare size={18} /> },
  { id: 'meetings', label: 'Meetings', icon: <FileText size={18} /> },
  { id: 'editor', label: 'Editor', icon: <PenTool size={18} /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={18} /> },
  { id: 'telegram', label: 'Telegram', icon: <MessageCircle size={18} /> },
  { id: 'triggers', label: 'Triggers', icon: <Zap size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

const mobilePrimaryNav: NavigationItem[] = ['dashboard', 'calendar', 'projects', 'invoices', 'settings'];

export default function App() {
  const [activeNav, setActiveNav] = useState<NavigationItem>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': setActiveNav('dashboard'); break;
        case '2': setActiveNav('calendar'); break;
        case '3': setActiveNav('projects'); break;
        case '4': setActiveNav('meetings'); break;
        case '5': setActiveNav('editor'); break;
        case '6': setActiveNav('invoices'); break;
        case '7': setActiveNav('telegram'); break;
        case '8': setActiveNav('triggers'); break;
        case '9': setActiveNav('settings'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const renderPage = useCallback(() => {
    switch (activeNav) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <Calendar />;
      case 'projects': return <Projects />;
      case 'meetings': return <Meetings />;
      case 'editor': return <Editor />;
      case 'invoices': return <Invoices />;
      case 'telegram': return <TelegramMessage />;
      case 'triggers': return <Triggers />;
      case 'settings': return <SettingsPage />;
    }
  }, [activeNav]);

  const activeNavLabel = navItems.find((item) => item.id === activeNav)?.label || 'marnagement';

  const handleNavigate = (item: NavigationItem) => {
    setActiveNav(item);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="hidden h-full md:flex">
        <Sidebar active={activeNav} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">
            {renderPage()}
          </div>
        </main>
      </div>

      <div className="relative flex h-full flex-col bg-gradient-to-b from-gray-50 to-white md:hidden">
        <header className="mobile-safe-top sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">marnagement</p>
              <p className="text-sm font-semibold text-gray-900">{activeNavLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="absolute inset-0 z-40 bg-black/30">
            <div className="mobile-safe-top absolute inset-x-0 top-0 mx-auto mt-2 max-w-md rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
              <div className="max-h-[65vh] overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={clsx(
                      'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium',
                      activeNav === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md px-4 py-4">
            {renderPage()}
          </div>
        </main>

        <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto grid h-20 max-w-md grid-cols-5 px-2">
            {mobilePrimaryNav.map((itemId) => {
              const item = navItems.find((navItem) => navItem.id === itemId);
              if (!item) return null;

              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-1 rounded-xl',
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  )}
                >
                  <span className={clsx('transition-transform', isActive && 'scale-110')}>{item.icon}</span>
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
