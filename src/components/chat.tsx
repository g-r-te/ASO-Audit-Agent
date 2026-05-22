'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { MarkdownMessage } from './markdown-message';

function isConfirmationPending(messages: { role: string; parts?: { type?: string; text?: string }[] }[]) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant?.parts) return false;
  const text = lastAssistant.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('');
  return /Is this the app you meant|please confirm/i.test(text);
}

export function Chat() {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
          }
        }
      } catch {
        /* fresh session */
      }
    };
    loadHistory();
  }, [setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    sendMessage({ text: input });
    setInput('');
  };

  const showConfirmHint = isConfirmationPending(messages);
  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">ASO Audit Agent</h1>
            <p className="text-sm text-[var(--muted)]">
              Paste an App Store URL to get a scored optimization audit
            </p>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent)]">
            Mastra
          </span>
        </div>
      </header>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-8 text-center">
              <p className="mb-3 text-[var(--muted)]">Try an example URL:</p>
              <button
                type="button"
                className="text-sm text-[var(--accent)] hover:underline"
                onClick={() =>
                  setInput(
                    'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580',
                  )
                }
              >
                Spotify on the US App Store
              </button>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                {message.parts?.map((part, i) => {
                  if (part.type === 'text' && part.text) {
                    return message.role === 'assistant' ? (
                      <MarkdownMessage key={`${message.id}-${i}`} content={part.text} />
                    ) : (
                      <p key={`${message.id}-${i}`} className="whitespace-pre-wrap text-sm">
                        {part.text}
                      </p>
                    );
                  }

                  if (part.type?.startsWith('tool-')) {
                    const toolPart = part as {
                      type: string;
                      state?: string;
                      toolName?: string;
                    };
                    const label = toolPart.type.replace('tool-', '').replace(/-/g, ' ');
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--muted)]"
                      >
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)] mr-2" />
                        Running {label}…
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:300ms]" />
              </span>
              Agent is working…
            </div>
          )}

          {showConfirmHint && !isLoading && (
            <div className="flex flex-wrap gap-2">
              {['Yes, run the audit', 'No, different app'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    sendMessage({ text: label });
                  }}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]/90 px-4 py-4 backdrop-blur">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste App Store URL (https://apps.apple.com/...)"
            disabled={isLoading}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
