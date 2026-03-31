'use client';

import { useState, useEffect, useCallback } from 'react';
import { NavigationItem } from '@/types';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Calendar from '@/components/Calendar';
import Meetings from '@/components/Meetings';
import Editor from '@/components/Editor';
import Invoices from '@/components/Invoices';
import SettingsPage from '@/components/Settings';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavigationItem>('dashboard');

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': setActiveNav('dashboard'); break;
        case '2': setActiveNav('calendar'); break;
        case '3': setActiveNav('meetings'); break;
        case '4': setActiveNav('editor'); break;
        case '5': setActiveNav('invoices'); break;
        case '6': setActiveNav('settings'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const renderPage = useCallback(() => {
    switch (activeNav) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <Calendar />;
      case 'meetings': return <Meetings />;
      case 'editor': return <Editor />;
      case 'invoices': return <Invoices />;
      case 'settings': return <SettingsPage />;
    }
  }, [activeNav]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={activeNav} onNavigate={setActiveNav} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
