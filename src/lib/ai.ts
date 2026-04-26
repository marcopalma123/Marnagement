// AI transcription and summarization utilities
// Free approaches:
// 1. Web Speech API (browser built-in, real-time, zero cost)
// 2. OpenAI Whisper API (whisper-1 model, free tier)

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;

async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegLoaded && ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  ffmpegLoaded = true;
  return ffmpeg;
}

export async function convertMp4ToMp3(file: File): Promise<File> {
  try {
    const ff = await loadFFmpeg();
    
    const inputName = 'input.mp4';
    const outputName = 'output.mp3';
    
    await ff.writeFile(inputName, await fetchFile(file));
    await ff.exec(['-i', inputName, '-q:a', '2', '-map', 'a', outputName]);
    
    const data = await ff.readFile(outputName);
    
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);
    
    const blob = new Blob([data as unknown as BlobPart], { type: 'audio/mp3' });
    return new File([blob], file.name.replace(/\.mp4$/i, '.mp3'), { type: 'audio/mp3' });
  } catch (err) {
    console.error('FFmpeg conversion error:', err);
    throw new Error('Failed to convert MP4 to MP3. Please ensure the file is a valid video file.');
  }
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
}

// ─── Web Speech API (Free, Browser-native) ───

export class SpeechRecorder {
  private recognition: InstanceType<typeof SpeechRecognition> | null = null;
  private isRecording = false;
  private transcript = '';
  private onTranscriptUpdate?: (text: string) => void;

  constructor(onTranscriptUpdate?: (text: string) => void) {
    this.onTranscriptUpdate = onTranscriptUpdate;

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' ';
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript) {
            this.transcript += finalTranscript;
          }
          this.onTranscriptUpdate?.(this.transcript + interimTranscript);
        };

        this.recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          this.isRecording = false;
        };

        this.recognition.onend = () => {
          this.isRecording = false;
        };
      }
    }
  }

  get supported(): boolean {
    return this.recognition !== null;
  }

  get recording(): boolean {
    return this.isRecording;
  }

  get currentTranscript(): string {
    return this.transcript;
  }

  start(): boolean {
    if (!this.recognition) return false;
    try {
      this.transcript = '';
      this.recognition.start();
      this.isRecording = true;
      return true;
    } catch {
      return false;
    }
  }

  stop(): string {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
    return this.transcript;
  }

  setLanguage(lang: string): void {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
}

// ─── OpenAI Whisper API (Free tier) ───

export async function transcribeWithWhisper(
  audioFile: File,
  apiKey: string
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { text: data.text };
}

// ─── AI Summary Generation ───

export async function generateMeetingSummary(
  transcript: string,
  apiKey: string,
  meetingTitle?: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a meeting notes summarizer. Given a meeting transcript, produce a structured summary with:
- **Meeting Overview** (1-2 sentences)
- **Key Discussion Points** (bullet points)
- **Decisions Made** (bullet points)
- **Action Items** (bullet points with owners if mentioned)
- **Next Steps** (if mentioned)

Keep it concise and professional. Use markdown formatting.`,
        },
        {
          role: 'user',
          content: `Meeting: ${meetingTitle || 'Untitled Meeting'}\n\nTranscript:\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Summary API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Supported audio formats ───

export const SUPPORTED_AUDIO_FORMATS = [
  '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm',
];

export function isAudioFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_AUDIO_FORMATS.includes(ext) || file.type.startsWith('audio/');
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
