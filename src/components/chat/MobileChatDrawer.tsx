'use client';

import { useState } from 'react';
import { ChatPanel } from './ChatPanel';

export function MobileChatDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Ask AI button — mobile only (hidden on lg+) */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-accent text-bg font-semibold text-sm rounded-full shadow-lg hover:bg-accent/90 active:scale-95 transition-all"
        aria-label="Open AI chat"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Ask AI
      </button>

      {/* Full-screen chat overlay — mobile only */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <ChatPanel
            className="flex-1 flex flex-col bg-surface w-full"
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
