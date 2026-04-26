'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Bold, Italic, Code, Link, RefreshCw, User } from 'lucide-react';

interface ChatMessage {
  messageId: number;
  text: string;
  chatId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  timestamp: string;
  isOwn?: boolean;
}

export default function TelegramMessage() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [polling, setPolling] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const pollMessages = async () => {
    setPolling(true);
    try {
      const res = await fetch('/api/telegram');
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setChatMessages(prev => {
          const existingIds = new Set(prev.map(m => m.messageId));
          const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.messageId));
          return [...prev, ...newMsgs];
        });
      }
    } catch (err) {
      console.error('Failed to poll messages:', err);
    } finally {
      setPolling(false);
    }
  };

  useEffect(() => {
    pollMessages();
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const insertTag = (before: string, after: string = before) => {
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    const newText = message.substring(0, start) + before + selectedText + after + message.substring(end);
    setMessage(newText);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    setError(null);
    setSent(false);
    
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }
      
      setChatMessages(prev => [...prev, {
        messageId: Date.now(),
        text: message,
        chatId: 0,
        timestamp: new Date().toISOString(),
        isOwn: true,
      }]);
      
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold tracking-tight">Telegram Message</h2>
      <p className="text-sm text-gray-400 mt-1">Send and receive messages from Telegram</p>

      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Chat Area */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-gray-400" />
              <span className="text-sm font-medium">Chat</span>
            </div>
            <button
              onClick={pollMessages}
              disabled={polling}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            >
              <RefreshCw size={14} className={polling ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="h-80 overflow-y-auto space-y-2"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-gray-400 text-center">
                  No messages yet.<br />Send a message to start the chat.
                </p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    msg.isOwn 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  } rounded-lg px-3 py-2`}>
                    {!msg.isOwn && (
                      <div className="flex items-center gap-1 mb-1">
                        <User size={10} />
                        <span className="text-xs font-medium">
                          {msg.firstName || msg.username || 'User'}
                        </span>
                      </div>
                    )}
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compose Area */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-1 mb-3 pb-3 border-b border-gray-100">
            <button
              onClick={() => insertTag('<b>', '</b>')}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => insertTag('<i>', '</i>')}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => insertTag('<code>', '</code>')}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Code"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => insertTag('<a href="">', '</a>')}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Link"
            >
              <Link size={16} />
            </button>
            <span className="text-xs text-gray-300 ml-2">
              HTML
            </span>
          </div>

          <textarea
            id="message-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none font-mono"
          />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-gray-300" />
              <span className="text-xs text-gray-400">
                Telegram
              </span>
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              {sending ? (
                'Sending...'
              ) : (
                <>
                  <Send size={14} /> Send
                </>
              )}
            </button>
          </div>

          {sent && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">✓ Message sent successfully!</p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">Error: {error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Formatting Help</h3>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div><span className="text-blue-600">&lt;b&gt;</span>bold<span className="text-blue-600">&lt;/b&gt;</span></div>
          <div><span className="text-blue-600">&lt;i&gt;</span>italic<span className="text-blue-600">&lt;/i&gt;</span></div>
          <div><span className="text-blue-600">&lt;code&gt;</span>code<span className="text-blue-600">&lt;/code&gt;</span></div>
          <div><span className="text-blue-600">&lt;a href="url"&gt;</span>link<span className="text-blue-600">&lt;/a&gt;</span></div>
        </div>
      </div>
    </div>
  );
}