'use client';

import { useState, useEffect } from 'react';
import { WorkDay, SpecialDay, Project } from '@/types';
import { getWorkDays, saveWorkDay, deleteWorkDay, getSpecialDays, saveSpecialDay, deleteSpecialDay, getWorkDaysRemote, getSpecialDaysRemote, getProjectsRemote, generateId } from '@/lib/store';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday, isWeekend, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Palmtree, Thermometer, CalendarDays } from 'lucide-react';
import clsx from 'clsx';

type DayType = 'work' | 'vacation' | 'sick' | 'holiday' | 'weekend';

export default function Calendar() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editHours, setEditHours] = useState(8);
  const [dayType, setDayType] = useState<DayType>('work');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [showInactiveProjects, setShowInactiveProjects] = useState(false);

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    const project = projects.find(p => p.id === projectId);
    return project?.name || '';
  };

  useEffect(() => {
    async function loadData() {
      console.log('[Calendar] Loading data...');
      const [wd, sd, proj] = await Promise.all([
        getWorkDaysRemote(),
        getSpecialDaysRemote(),
        getProjectsRemote()
      ]);
      console.log('[Calendar] Loaded workDays:', wd);
      console.log('[Calendar] Loaded specialDays:', sd);
      setWorkDays(wd);
      setSpecialDays(sd);
      setProjects(proj);
    }
    loadData();
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = (monthStart.getDay() + 6) % 7;
  const paddedDays = Array(startPadding).fill(null).concat(allDays);

  const getWorkDay = (date: string) => workDays.find((d) => d.date === date);
  const getSpecialDay = (date: string) => specialDays.find((d) => d.date === date);

  const getDayType = (date: string): DayType => {
    const specialDay = getSpecialDay(date);
    if (specialDay) {
      return specialDay.type as DayType;
    }
    const workDay = getWorkDay(date);
    if (workDay?.isBusinessDay) return 'work';
    return 'weekend';
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    const workDay = getWorkDay(date);
    const specialDay = getSpecialDay(date);
    const isWeekendDay = isWeekend(parseISO(date));

    if (specialDay) {
      setDayType(specialDay.type as DayType);
      setEditNote(specialDay.notes || '');
      setSelectedProject('');
    } else if (workDay?.isBusinessDay) {
      setDayType('work');
      setEditNote(workDay.notes);
      setEditHours(workDay.hoursWorked);
      setSelectedProject(workDay.projectId || '');
    } else if (isWeekendDay) {
      setDayType('weekend');
      setEditNote('');
      setSelectedProject('');
    } else {
      setDayType('work');
      setEditNote('');
      setEditHours(8);
      setSelectedProject('');
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const dateObj = parseISO(selectedDate);
    const isWeekendDay = isWeekend(dateObj);

    if (dayType === 'work' && !isWeekendDay) {
      const workDay: WorkDay = {
        id: getWorkDay(selectedDate)?.id || generateId(),
        date: selectedDate,
        hoursWorked: editHours,
        notes: editNote,
        projectId: selectedProject || undefined,
        isBusinessDay: true,
      };
      saveWorkDay(workDay);
      // Update local state immediately for better UX
      setWorkDays((prev) => {
        const filtered = prev.filter((d) => d.date !== selectedDate);
        return [workDay, ...filtered];
      });
    } else {
      const existingWorkDay = getWorkDay(selectedDate);
      if (existingWorkDay) {
        deleteWorkDay(existingWorkDay.id);
      }
    }

    if (dayType === 'vacation' || dayType === 'sick' || dayType === 'holiday') {
      const specialDay: SpecialDay = {
        id: getSpecialDay(selectedDate)?.id || generateId(),
        date: selectedDate,
        type: dayType as 'vacation' | 'sick' | 'holiday',
        notes: editNote,
        createdAt: getSpecialDay(selectedDate)?.createdAt || new Date().toISOString(),
      };
      saveSpecialDay(specialDay);
      // Update local state immediately for better UX
      setSpecialDays((prev) => {
        const filtered = prev.filter((d) => d.date !== selectedDate);
        return [specialDay, ...filtered];
      });
    } else {
      const existingSpecial = getSpecialDay(selectedDate);
      if (existingSpecial) {
        deleteSpecialDay(existingSpecial.id);
        setSpecialDays((prev) => prev.filter((d) => d.id !== existingSpecial.id));
      }
    }

    setSelectedDate(null);
  };

  const handleDelete = async () => {
    if (!selectedDate) return;
    const workDay = getWorkDay(selectedDate);
    const specialDay = getSpecialDay(selectedDate);
    if (workDay) {
      deleteWorkDay(workDay.id);
      setWorkDays((prev) => prev.filter((d) => d.id !== workDay.id));
    }
    if (specialDay) {
      deleteSpecialDay(specialDay.id);
      setSpecialDays((prev) => prev.filter((d) => d.id !== specialDay.id));
    }
    setSelectedDate(null);
  };

  const thisMonthWorked = workDays.filter(
    (d) => d.date.startsWith(format(currentMonth, 'yyyy-MM')) && d.isBusinessDay
  );

  const getDayIndicator = (type: DayType) => {
    switch (type) {
      case 'vacation':
        return <Palmtree size={12} className="text-green-500" />;
      case 'sick':
        return <Thermometer size={12} className="text-red-500" />;
      case 'holiday':
        return <CalendarDays size={12} className="text-purple-500" />;
      case 'work':
        return <div className="w-2 h-2 rounded-full bg-blue-500" />;
      default:
        return null;
    }
  };

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

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Work</span>
        </div>
        <div className="flex items-center gap-1">
          <Palmtree size={12} className="text-green-500" />
          <span>Vacation</span>
        </div>
        <div className="flex items-center gap-1">
          <Thermometer size={12} className="text-red-500" />
          <span>Sick</span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarDays size={12} className="text-purple-500" />
          <span>Holiday</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
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
            const type = getDayType(dateStr);
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
                  isWeekendDay && type === 'weekend' && 'text-gray-300',
                  !isWeekendDay && type === 'weekend' && 'text-gray-400',
                )}>
                  {format(day, 'd')}
                </span>
                {type !== 'weekend' && (
                  <div className="mt-1 flex items-center gap-1">
                    {getDayIndicator(type)}
                    {type === 'work' && (
                      <p className="text-[10px] text-gray-400 font-mono">
                        {getWorkDay(dateStr)?.hoursWorked || 8}h{getWorkDay(dateStr)?.projectId ? ` - ${getProjectName(getWorkDay(dateStr)?.projectId)}` : ''}
                      </p>
                    )}
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
            {/* Day type selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">Day type</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'work', label: 'Work', icon: null },
                  { value: 'vacation', label: 'Vacation', icon: <Palmtree size={14} /> },
                  { value: 'sick', label: 'Sick', icon: <Thermometer size={14} /> },
                  { value: 'holiday', label: 'Holiday', icon: <CalendarDays size={14} /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDayType(opt.value as DayType)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      dayType === opt.value
                        ? opt.value === 'work' ? 'bg-blue-100 text-blue-700'
                          : opt.value === 'vacation' ? 'bg-green-100 text-green-700'
                          : opt.value === 'sick' ? 'bg-red-100 text-red-700'
                          : 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {dayType === 'work' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Project</label>
                  <label className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={showInactiveProjects}
                      onChange={(e) => setShowInactiveProjects(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Show inactive projects
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="">No project</option>
                    {projects.filter(p => p.isActive !== false || showInactiveProjects).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.isActive === false ? ' (inactive)' : ''}</option>
                    ))}
                  </select>
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
              </>
            )}

            {(dayType === 'vacation' || dayType === 'sick' || dayType === 'holiday') && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Add notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              {(getWorkDay(selectedDate) || getSpecialDay(selectedDate)) && (
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