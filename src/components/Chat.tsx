import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Info, Lock, LogIn, LogOut, MessageCircle, SendHorizontal, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../../shared/types';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
}

function Line({ m, odd }: { m: ChatMessage; odd: boolean }) {
  const base = 'flex items-start gap-1.5 px-3 py-1.5 text-sm leading-snug break-words';
  switch (m.kind) {
    case 'correct':
      return (
        <div className={`${base} bg-emerald-100 font-bold text-emerald-700`}>
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{m.text}</span>
        </div>
      );
    case 'close':
      return (
        <div className={`${base} bg-amber-50 font-bold text-amber-600`}>
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <span>{m.text}</span>
        </div>
      );
    case 'system':
      return (
        <div className={`${base} font-bold text-indigo-600 ${odd ? 'bg-indigo-50/60' : ''}`}>
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{m.text}</span>
        </div>
      );
    case 'join':
      return (
        <div className={`${base} font-bold text-emerald-600 ${odd ? 'bg-indigo-50/60' : ''}`}>
          <LogIn className="mt-0.5 size-4 shrink-0" />
          <span>{m.text}</span>
        </div>
      );
    case 'leave':
      return (
        <div className={`${base} font-bold text-rose-500 ${odd ? 'bg-indigo-50/60' : ''}`}>
          <LogOut className="mt-0.5 size-4 shrink-0" />
          <span>{m.text}</span>
        </div>
      );
    case 'private':
      return (
        <div className={`${base} text-emerald-700 ${odd ? 'bg-emerald-50/70' : 'bg-emerald-50/40'}`}>
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <b>{m.name}:</b> {m.text}
          </span>
        </div>
      );
    default:
      return (
        <div className={`${base} text-slate-700 ${odd ? 'bg-indigo-50/60' : ''}`}>
          <span>
            <b className="text-indigo-950">{m.name}:</b> {m.text}
          </span>
        </div>
      );
  }
}

export default function Chat({ messages, onSend, placeholder = 'Type your guess here…', title = 'Chat', className = '' }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
    stickToBottom.current = true;
  };

  return (
    <div className={`panel flex min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b-4 border-indigo-50 px-4 py-2.5 font-display text-lg font-semibold text-indigo-900">
        <MessageCircle className="size-5 text-pink-500" />
        {title}
      </div>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {messages.length === 0 && <p className="p-4 text-center text-sm font-semibold text-slate-400">No messages yet — say hi! 👋</p>}
        {messages.map((m, i) => (
          <Line key={m.id} m={m} odd={i % 2 === 1} />
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t-4 border-indigo-50 p-2.5">
        <input
          className="input py-2.5 text-sm"
          value={text}
          maxLength={100}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Chat message"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-pink shrink-0 px-3.5 py-2.5" aria-label="Send">
          <SendHorizontal className="size-5" />
        </button>
      </form>
    </div>
  );
}
