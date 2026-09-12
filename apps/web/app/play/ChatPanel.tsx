"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

const CHAT_MESSAGE_MAX_LENGTH = 200;
/** Keeps the DOM list bounded during a long play session; the server keeps no history at all. */
const MAX_VISIBLE_MESSAGES = 100;

export interface ChatMessageItem {
  id: string;
  nickname: string;
  text: string;
}

interface ChatPanelProps {
  messages: ChatMessageItem[];
  onSend: (text: string) => void;
  disabled?: boolean;
  errorMessage?: string | null;
}

/**
 * A plain HTML overlay rather than a Phaser text object: a real <input>
 * is what makes Korean (and any IME) composition work at all, and it is
 * what lets stopPropagation keep WASD/E from also driving the character
 * while a message is being typed -- see the keydown/keyup handlers below.
 */
export function ChatPanel({ messages, onSend, disabled, errorMessage }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled) {
      return;
    }
    onSend(text);
    setDraft("");
  }

  // Stops WASD/E (and every other game hotkey) from also firing while typing --
  // both KeyboardInput and Phaser's own keyboard capture listen on `window`,
  // so halting propagation here keeps the event from ever reaching them.
  function stopGameHotkeys(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
  }

  const visibleMessages = messages.slice(-MAX_VISIBLE_MESSAGES);

  return (
    <div className="pixel-corners-sm pointer-events-auto absolute bottom-3 left-3 z-10 flex w-[min(320px,calc(100vw-1.5rem))] flex-col border-2 border-ink-900 bg-wood-800/90 text-cream-400 shadow-[0_3px_0_0_#3a2415]">
      <div
        ref={listRef}
        className="flex h-40 flex-col gap-1 overflow-y-auto px-3 py-2 text-sm"
        role="log"
        aria-live="polite"
      >
        {visibleMessages.length === 0 ? (
          <p className="text-cream-400/60">아직 채팅이 없어요.</p>
        ) : (
          visibleMessages.map((message) => (
            <p key={message.id} className="break-words">
              <span className="font-[family-name:var(--font-display)] text-accent-500">
                {message.nickname}
              </span>
              <span>: {message.text}</span>
            </p>
          ))
        )}
      </div>
      {errorMessage && (
        <p className="border-t border-wood-900 px-3 py-1 text-xs text-bad">{errorMessage}</p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-1 border-t border-wood-900 p-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={stopGameHotkeys}
          onKeyUp={stopGameHotkeys}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          placeholder="메시지를 입력하세요"
          disabled={disabled}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-sm border-2 border-ink-900 bg-cream-500 px-2 py-1 text-sm text-ink-900 placeholder:text-ink-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || draft.trim().length === 0}
          className="pixel-corners-sm border-2 border-ink-900 bg-accent-500 px-3 py-1 text-sm font-[family-name:var(--font-display)] text-ink-900 transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}
