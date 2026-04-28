'use client';

import { useState, useEffect } from 'react';
import { WorkDay, SpecialDay, Project, WorkType } from '@/types';
import { saveWorkDay, deleteWorkDay, saveSpecialDay, deleteSpecialDay, getWorkDaysRemote, getSpecialDaysRemote, getProjectsRemote, generateId, saveProject } from '@/lib/store';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday, isWeekend, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Palmtree, Thermometer, CalendarDays, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

type DayType = 'work' | 'vacation' | 'sick' | 'holiday' | 'weekend';

export default function Calendar() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [dayType, setDayType] = useState<DayType>('work');
  const [newProjectId, setNewProjectId] = useState('');
  const [newWorkType, setNewWorkType] = useState<WorkType>('development');
  const [newProjectHours, setNewProjectHours] = useState(8);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkIncludeWeekends, setBulkIncludeWeekends] = useState(false);
  const [bulkSkipExisting, setBulkSkipExisting] = useState(true);
  const [showInactiveProjects, setShowInactiveProjects] = useState(false);

  const getProjectName = (projectId: string) => {
    if (!projectId) return '';
    const project = projects.find(p => p.id === projectId);
    return project?.name || '';
  };

  const getProjectWorkType = (projectId: string): WorkType => {
    if (!projectId) return 'development';
    const project = projects.find((p) => p.id === projectId);
    return project?.workType || 'development';
  };

  useEffect(() => {
    async function loadData() {
      const [wd, sd, proj] = await Promise.all([
        getWorkDaysRemote(),
        getSpecialDaysRemote(),
        getProjectsRemote()
      ]);
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

  const getWorkDayEntries = (date: string) => workDays.filter((d) => d.date === date);
  const getSpecialDay = (date: string) => specialDays.find((d) => d.date === date);

  const getDayType = (date: string): DayType => {
    const specialDay = getSpecialDay(date);
    if (specialDay) {
      return specialDay.type as DayType;
    }
    const workEntries = getWorkDayEntries(date);
    if (workEntries.length > 0) return 'work';
    return 'weekend';
  };

  const getTotalHours = (date: string): number => {
    const entries = getWorkDayEntries(date);
    return entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setBulkStartDate(date);
    setBulkEndDate(date);
    const workEntries = getWorkDayEntries(date);
    const specialDay = getSpecialDay(date);
    const isWeekendDay = isWeekend(parseISO(date));

    if (specialDay) {
      setDayType(specialDay.type as DayType);
      setEditNote(specialDay.notes || '');
    } else if (workEntries.length > 0) {
      setDayType('work');
      setEditNote(workEntries[0].notes || '');
    } else if (isWeekendDay) {
      setDayType('weekend');
      setEditNote('');
    } else {
      setDayType('work');
      setEditNote('');
    }
  };

  const handleAddProject = () => {
    if (!selectedDate || !newProjectId) return;

    const targetDates = bulkMode
      ? getDateRange(bulkStartDate || selectedDate, bulkEndDate || selectedDate, bulkIncludeWeekends)
      : [selectedDate];
    if (targetDates.length === 0) return;

    const newEntries: WorkDay[] = [];
    for (const date of targetDates) {
      const existingEntries = getWorkDayEntries(date);
      const hasSameProject = existingEntries.some((entry) => entry.projectId === newProjectId);
      if (bulkMode && bulkSkipExisting && hasSameProject) continue;

      const workDay: WorkDay = {
        id: generateId(),
        date,
        projectId: newProjectId,
        hoursWorked: newProjectHours || 8,
        notes: editNote,
      };
      saveWorkDay(workDay);
      newEntries.push(workDay);
    }

    if (newEntries.length > 0) {
      setWorkDays((prev) => [...prev, ...newEntries]);
    }

    const selectedProject = projects.find((p) => p.id === newProjectId);
    if (selectedProject && (selectedProject.workType || 'development') !== newWorkType) {
      const updatedProject: Project = { ...selectedProject, workType: newWorkType };
      saveProject(updatedProject);
      setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    }

    setNewProjectId('');
    setNewWorkType('development');
    setNewProjectHours(8);
  };

  const handleUpdateEntry = (id: string, hours: number) => {
    setWorkDays(prev => prev.map(e => 
      e.id === id ? { ...e, hoursWorked: hours } : e
    ));
    const entry = workDays.find(e => e.id === id);
    if (entry) {
      saveWorkDay({ ...entry, hoursWorked: hours });
    }
  };

  const handleRemoveEntry = (id: string) => {
    deleteWorkDay(id);
    setWorkDays(prev => prev.filter(e => e.id !== id));
  };

  const handleSave = async () => {
    if (!selectedDate || dayEntries.length === 0) return;
    const dateObj = parseISO(selectedDate);
    const isWeekendDay = isWeekend(dateObj);

    if (dayType === 'vacation' || dayType === 'sick' || dayType === 'holiday') {
      const specialDay: SpecialDay = {
        id: getSpecialDay(selectedDate)?.id || generateId(),
        date: selectedDate,
        type: dayType as 'vacation' | 'sick' | 'holiday',
        notes: editNote,
        createdAt: getSpecialDay(selectedDate)?.createdAt || new Date().toISOString(),
      };
      saveSpecialDay(specialDay);
      setSpecialDays(prev => {
        const filtered = prev.filter(d => d.date !== selectedDate);
        return [specialDay, ...filtered];
      });
    }

    setSelectedDate(null);
  };

  const handleDelete = async () => {
    if (!selectedDate) return;
    const workEntries = getWorkDayEntries(selectedDate);
    const specialDay = getSpecialDay(selectedDate);
    
    for (const entry of workEntries) {
      deleteWorkDay(entry.id);
    }
    setWorkDays(prev => prev.filter(e => e.date !== selectedDate));
    
    if (specialDay) {
      deleteSpecialDay(specialDay.id);
      setSpecialDays(prev => prev.filter(d => d.id !== specialDay.id));
    }
    setSelectedDate(null);
  };

  const thisMonthWorked = workDays.filter(
    (d) => d.date.startsWith(format(currentMonth, 'yyyy-MM'))
  );

  const thisMonthHours = thisMonthWorked.reduce((sum, d) => sum + (d.hoursWorked || 0), 0);

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

  const dayEntries = selectedDate ? getWorkDayEntries(selectedDate) : [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>
          <p className="text-sm text-gray-400 mt-1">
            {thisMonthWorked.length} entries · {thisMonthHours}h this month
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
            const dayEntries = getWorkDayEntries(dateStr);
            const totalHrs = getTotalHours(dateStr);

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
                  <div className="mt-1 space-y-0.5">
                    {type === 'work' && dayEntries.length > 0 ? (
                      dayEntries.slice(0, 2).map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span className="text-[9px] text-gray-500 truncate max-w-[60px]">
                            {getProjectName(entry.projectId).slice(0, 8)}
                          </span>
                          <span className="text-[8px] uppercase text-gray-400">
                            {getProjectWorkType(entry.projectId).slice(0, 3)}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {entry.hoursWorked}h
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-1">
                        {getDayIndicator(type)}
                        {type === 'work' && (
                          <span className="text-[10px] text-gray-400 font-mono">{totalHrs}h</span>
                        )}
                      </div>
                    )}
                    {dayEntries.length > 2 && (
                      <p className="text-[8px] text-gray-400">+{dayEntries.length - 2} more</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

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
                  <label className="text-xs text-gray-400 block mb-2">Project Time Entries</label>
                  <label className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={showInactiveProjects}
                      onChange={(e) => setShowInactiveProjects(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Show inactive
                  </label>
                  
                  <div className="space-y-2 mb-3">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span className="flex-1 text-sm">{getProjectName(entry.projectId)}</span>
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          max={24}
                          value={entry.hoursWorked}
                          onChange={(e) => handleUpdateEntry(entry.id, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-sm font-mono text-center"
                        />
                        <span className="text-xs text-gray-400">h</span>
                        <button
                          onClick={() => handleRemoveEntry(entry.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={bulkMode}
                        onChange={(e) => setBulkMode(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Add to multiple days
                    </label>
                    {bulkMode && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">From</label>
                            <input
                              type="date"
                              value={bulkStartDate}
                              onChange={(e) => setBulkStartDate(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">To</label>
                            <input
                              type="date"
                              value={bulkEndDate}
                              onChange={(e) => setBulkEndDate(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={bulkIncludeWeekends}
                            onChange={(e) => setBulkIncludeWeekends(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          Include weekends
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={bulkSkipExisting}
                            onChange={(e) => setBulkSkipExisting(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          Skip days that already have this project
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={newProjectId}
                      onChange={(e) => {
                        const projectId = e.target.value;
                        setNewProjectId(projectId);
                        setNewWorkType(getProjectWorkType(projectId));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <option value="">No project</option>
                      {projects
                        .filter(p => p.isActive !== false || showInactiveProjects)
                        .filter(p => !dayEntries.some(e => e.projectId === p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <select
                      value={newWorkType}
                      onChange={(e) => setNewWorkType(e.target.value as WorkType)}
                      className="w-32 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <option value="development">Development</option>
                      <option value="testing">Testing</option>
                      <option value="support">Support</option>
                    </select>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={24}
                      value={newProjectHours}
                      onChange={(e) => setNewProjectHours(parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono text-center"
                    />
                    <button
                      onClick={handleAddProject}
                      disabled={!newProjectId || (bulkMode && (!bulkStartDate || !bulkEndDate))}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {dayEntries.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Total: </span>
                      <span className="text-sm font-mono font-medium">
                        {getTotalHours(selectedDate)}h
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Notes</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="What did you work on?"
                    rows={2}
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
                disabled={dayEntries.length === 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
              {(dayEntries.length > 0 || getSpecialDay(selectedDate)) && (
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

function getDateRange(startDate: string, endDate: string, includeWeekends: boolean): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const rangeStart = start <= end ? start : end;
  const rangeEnd = start <= end ? end : start;
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  return days
    .filter((day) => includeWeekends || !isWeekend(day))
    .map((day) => format(day, 'yyyy-MM-dd'));
}
