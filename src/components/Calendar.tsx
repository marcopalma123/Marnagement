'use client';

import { useState, useEffect, useMemo } from 'react';
import { WorkDay } from '@/types';
import { getWorkDays, saveWorkDay, deleteWorkDay, generateId } from '@/lib/store';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameMonth, isToday, isWeekend, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import clsx from 'clsx';

export default function Calendar() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editHours, setEditHours] = useState(8);
  const [isBusinessDay, setIsBusinessDay] = useState(true);

  useEffect(() => {
    setWorkDays(getWorkDays());
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Monday
  const startPadding = (monthStart.getDay() + 6) % 7;
  const paddedDays = Array(startPadding).fill(null).concat(allDays);

  const getWorkDay = (date: string) => workDays.find((d) => d.date === date);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    const existing = getWorkDay(date);
    if (existing) {
      setEditNote(existing.notes);
      setEditHours(existing.hoursWorked);
      setIsBusinessDay(existing.isBusinessDay);
    } else {
      setEditNote('');
      setEditHours(8);
      setIsBusinessDay(!isWeekend(parseISO(date)));
    }
  };

  const handleSave = () => {
    if (!selectedDate) return;
    const day: WorkDay = {
      id: getWorkDay(selectedDate)?.id || generateId(),
      date: selectedDate,
      hoursWorked: editHours,
      notes: editNote,
      isBusinessDay,
    };
    saveWorkDay(day);
    setWorkDays(getWorkDays());
    setSelectedDate(null);
  };

  const handleDelete = () => {
    if (!selectedDate) return;
    const existing = getWorkDay(selectedDate);
    if (existing) {
      deleteWorkDay(existing.id);
      setWorkDays(getWorkDays());
    }
    setSelectedDate(null);
  };

  const thisMonthWorked = workDays.filter(
    (d) => d.date.startsWith(format(currentMonth, 'yyyy-MM')) && d.isBusinessDay
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>
          <p className="text-sm text-gray-400 mt-1">
            {thisMonthWorked.length} business days worked this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium w-36 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="p-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {paddedDays.map((day, i) => {
            if (!day) {
              return <div key={`pad-${i}`} className="border-b border-r border-gray-100 p-3 min-h-[90px]" />;
            }
            const dateStr = format(day, 'yyyy-MM-dd');
            const workDay = getWorkDay(dateStr);
            const hasWork = workDay?.isBusinessDay;
            const isWeekendDay = isWeekend(day);

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className={clsx(
                  'border-b border-r border-gray-100 p-3 min-h-[90px] text-left hover:bg-gray-50 transition-colors',
                  isToday(day) && 'bg-blue-50/50',
                  selectedDate === dateStr && 'ring-2 ring-blue-500 ring-inset',
                )}
              >
                <span className={clsx(
                  'text-sm font-medium',
                  isToday(day) && 'bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs',
                  isWeekendDay && !hasWork && 'text-gray-300',
                )}>
                  {format(day, 'd')}
                </span>
                {hasWork && (
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{workDay.hoursWorked}h</p>
                  </div>
                )}
                {workDay && !workDay.isBusinessDay && (
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit panel */}
      {selectedDate && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isBusinessDay}
                onChange={(e) => setIsBusinessDay(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-600">Business day (counted for invoicing)</span>
            </label>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Hours worked</label>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={editHours}
                onChange={(e) => setEditHours(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              {getWorkDay(selectedDate) && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
