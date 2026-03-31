'use client';

import { useState, useEffect, useRef } from 'react';
import { Meeting } from '@/types';
import { getMeetings, saveMeeting, deleteMeeting, generateId } from '@/lib/store';
import { format, parseISO } from 'date-fns';
import { Plus, X, FileText, Upload, Trash2 } from 'lucide-react';

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(60);
  const [summary, setSummary] = useState('');
  const [rawText, setRawText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMeetings(getMeetings());
  }, []);

  const handleFileUpload = async (file: File) => {
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      setRawText(text);
      // Auto-generate a basic summary
      const lines = text.split('\n').filter((l) => l.trim());
      setSummary(lines.slice(0, 5).join('\n'));
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    } else if (file.type.startsWith('audio/')) {
      // Store filename for audio files (actual transcription would need an API)
      setSummary(`Audio file: ${file.name}\n\n[Transcription would be processed here with AI integration]`);
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSave = () => {
    const meeting: Meeting = {
      id: selectedMeeting?.id || generateId(),
      title,
      date,
      duration,
      summary,
      rawText,
      createdAt: selectedMeeting?.createdAt || new Date().toISOString(),
    };
    saveMeeting(meeting);
    setMeetings(getMeetings());
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteMeeting(id);
    setMeetings(getMeetings());
    if (selectedMeeting?.id === id) resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedMeeting(null);
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setDuration(60);
    setSummary('');
    setRawText('');
  };

  const openMeeting = (m: Meeting) => {
    setSelectedMeeting(m);
    setTitle(m.title);
    setDate(m.date);
    setDuration(m.duration || 60);
    setSummary(m.summary);
    setRawText(m.rawText || '');
    setShowForm(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Meetings</h2>
          <p className="text-sm text-gray-400 mt-1">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> New Meeting
        </button>
      </div>

      {/* Meeting form */}
      {showForm && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">{selectedMeeting ? 'Edit Meeting' : 'New Meeting'}</h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Upload size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              Drop a text or audio file here, or click to upload
            </p>
            <p className="text-xs text-gray-300 mt-1">.txt, .md, .mp3, .wav, .m4a</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.mp3,.wav,.m4a,audio/*,text/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
          </div>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting title"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={6}
                placeholder="Meeting summary or notes..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
              {selectedMeeting && (
                <button
                  onClick={() => handleDelete(selectedMeeting.id)}
                  className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meetings list */}
      <div className="mt-6 space-y-2">
        {meetings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <FileText size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No meetings yet</p>
            <p className="text-xs text-gray-300 mt-1">Upload a file or create one manually</p>
          </div>
        ) : (
          meetings
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((m) => (
              <button
                key={m.id}
                onClick={() => openMeeting(m)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left card-hover"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(m.date), 'MMM d, yyyy')}
                      {m.duration && ` · ${m.duration} min`}
                    </p>
                  </div>
                  <FileText size={16} className="text-gray-300" />
                </div>
                {m.summary && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{m.summary}</p>
                )}
              </button>
            ))
        )}
      </div>
    </div>
  );
}
