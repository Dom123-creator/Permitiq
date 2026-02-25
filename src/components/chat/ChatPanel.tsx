'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  timestamp: Date;
}

const suggestionChips = [
  'What permits are overdue?',
  'Harris County electrical requirements',
  'Check Houston building code updates',
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.ok
          ? data.content
          : `Error: ${data.error || 'Agent request failed'}`,
        citations: res.ok ? (data.citations || []) : [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Network error — could not reach the agent. Check your connection.',
        citations: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <aside className="w-80 bg-surface border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-accent text-sm">AI</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">PermitIQ Agent</h2>
            <p className="text-xs text-muted">Ask about permits & codes</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">?</span>
            </div>
            <p className="text-sm text-muted mb-4">
              Ask me about permit status, jurisdiction requirements, or building codes
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestionChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSuggestionClick(chip)}
                  className="px-3 py-1.5 text-xs bg-surface2 border border-border rounded-full text-muted hover:text-text hover:border-muted transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-accent text-bg'
                    : 'bg-surface2 text-text'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted mb-1">Sources:</p>
                    {message.citations.map((citation, i) => (
                      <a
                        key={i}
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-accent hover:underline truncate"
                      >
                        {citation}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface2 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about permits..."
            className="input flex-1"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
