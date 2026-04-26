'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Meeting } from '@/types';
import { getMeetings, saveMeeting, deleteMeeting, getSettings, getMeetingsRemote, getSettingsRemote, generateId } from '@/lib/store';
import { SpeechRecorder, transcribeWithWhisper, generateMeetingSummary, isAudioFile, formatDuration, convertMp4ToMp3 } from '@/lib/ai';
import { format, parseISO } from 'date-fns';
import { Plus, X, FileText, Upload, Trash2, Mic, MicOff, Wand2, Loader2, Volume2 } from 'lucide-react';
import clsx from 'clsx';

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(60);
  const [summary, setSummary] = useState('');
  const [rawText, setRawText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording state
  const recorderRef = useRef<SpeechRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Processing state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const [meetingsData, settingsData] = await Promise.all([
        getMeetingsRemote(),
        getSettingsRemote()
      ]);
      setMeetings(meetingsData);
      const s = settingsData || getSettings();
      setApiKey(s.openaiApiKey || '');
    }
    loadData();

    recorderRef.current = new SpeechRecorder((text) => {
      setLiveTranscript(text);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!recorderRef.current?.supported) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    setLiveTranscript('');
    setRawText('');
    setRecordingTime(0);
    setError('');

    const started = recorderRef.current.start();
    if (started) {
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const transcript = recorderRef.current?.stop() || '';
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalText = liveTranscript || transcript;
    if (finalText) {
      setRawText(finalText);
      setDuration(Math.max(1, Math.round(recordingTime / 60)));
    }
  }, [liveTranscript, recordingTime]);

  const handleFileUpload = async (file: File) => {
    setError('');

    let audioFile = file;
    
    // Convert MP4 to MP3 if needed
    if (file.name.toLowerCase().endsWith('.mp4')) {
      setIsTranscribing(true);
      try {
        setError('Converting MP4 to MP3...');
        audioFile = await convertMp4ToMp3(file);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'MP4 conversion failed');
        setIsTranscribing(false);
        return;
      }
    }

    if (isAudioFile(audioFile)) {
      if (!apiKey) {
        setError('OpenAI API key required for audio transcription. Add it in Settings.');
        return;
      }

      setIsTranscribing(true);
      try {
        const result = await transcribeWithWhisper(audioFile, apiKey);
        setRawText(result.text);
        setTitle(file.name.replace(/\.[^.]+$/, ''));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Transcription failed');
      } finally {
        setIsTranscribing(false);
      }
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      setRawText(text);
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleGenerateSummary = async () => {
    if (!rawText.trim() || !apiKey) {
      setError('Need transcript text and OpenAI API key to generate summary.');
      return;
    }
    setIsGeneratingSummary(true);
    setError('');
    try {
      const result = await generateMeetingSummary(rawText, apiKey, title);
      setSummary(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Summary generation failed');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSave = async () => {
    const meeting: Meeting = {
      id: selectedMeeting?.id || generateId(),
      title: title || 'Untitled Meeting',
      date,
      duration,
      summary,
      rawText,
      createdAt: selectedMeeting?.createdAt || new Date().toISOString(),
    };
    saveMeeting(meeting);
    setMeetings(await getMeetingsRemote());
    resetForm();
  };

  const handleDelete = async (id: string) => {
    deleteMeeting(id);
    setMeetings(await getMeetingsRemote());
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
    setLiveTranscript('');
    setRecordingTime(0);
    setError('');
    if (isRecording) stopRecording();
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

      {showForm && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">{selectedMeeting ? 'Edit Meeting' : 'New Meeting'}</h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Live Recording */}
          <div className="mb-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Live Recording</span>
                <span className="text-xs text-gray-300">(Web Speech API — free)</span>
              </div>
              {isRecording && (
                <span className="text-sm font-mono text-red-500 tabular-nums">
                  🔴 {formatDuration(recordingTime)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  <Mic size={16} /> Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 animate-pulse"
                >
                  <MicOff size={16} /> Stop Recording
                </button>
              )}
              {!recorderRef.current?.supported && (
                <span className="text-xs text-amber-500">Not supported in this browser</span>
              )}
            </div>

            {liveTranscript && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-1">Live transcript:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{liveTranscript}</p>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {isTranscribing ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Transcribing with Whisper AI...</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Drop an audio or text file here, or click to upload
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Audio: .mp3, .wav, .m4a, .webm → Whisper AI transcription
                </p>
                <p className="text-xs text-gray-300">
                  Text: .txt, .md
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.mp3,.mp4,.wav,.m4a,.webm,audio/*,text/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Form fields */}
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

            {/* Transcript */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Transcript</label>
                {rawText && apiKey && (
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
                  >
                    {isGeneratingSummary ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Wand2 size={12} />
                    )}
                    {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
                  </button>
                )}
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={5}
                placeholder="Transcript will appear here after recording or file upload..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none font-mono text-xs"
              />
            </div>

            {/* AI Summary */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={6}
                placeholder="Meeting summary — click 'AI Summary' to auto-generate, or write manually..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Meeting
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
            <p className="text-xs text-gray-300 mt-1">Record, upload a file, or create manually</p>
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
                      {m.rawText && ` · ${m.rawText.split(/\s+/).length} words`}
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
