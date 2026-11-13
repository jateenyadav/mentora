import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Markdown } from '../lib/md';
import { KIND_INFO, type Memory, type Reflection, type Session, type SessionSummary } from '../lib/types';

const TOPICS = ['Statistics basics', 'Python for beginners', 'Class 10 Physics: electricity', 'English grammar: tenses', 'Personal finance basics'];
const REFLECT_EVERY = 8; // messages

export default function Learn({ onDueCards }: { onDueCards: () => void }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [topic, setTopic] = useState('');
  const [socratic, setSocratic] = useState(false);
  const [due, setDue] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ sessions: SessionSummary[] }>('/sessions').then((d) => setSessions(d.sessions), () => {});
    api<{ due: number }>('/progress').then((d) => setDue(d.due), () => {});
  }, [session]);

  const start = async (t: string) => {
    setError('');
    try {
      setSession((await api<{ session: Session }>('/sessions', { body: { topic: t.trim(), mode: socratic ? 'socratic' : 'normal' } })).session);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start.'); }
  };
  const open = async (id: string) => setSession((await api<{ session: Session }>(`/sessions/${id}`)).session);

  if (session) return <Chat initial={session} onClose={() => setSession(null)} />;

  const recentTopics = [...new Set(sessions.map((s) => s.topic))].slice(0, 4);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white sm:p-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">What shall we learn today?</h1>
          <p className="mt-1 text-sm opacity-90">Mentora picks up where you left off and adapts to how you learn.</p>
        </div>
        <form className="space-y-4 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); if (topic.trim().length >= 2) void start(topic); }}>
          <div className="flex gap-2">
            <input className="field text-base" value={topic} maxLength={80} onChange={(e) => setTopic(e.target.value)} placeholder="Any topic, e.g. Statistics basics" aria-label="Topic" />
            <button className="btn-primary px-5" disabled={topic.trim().length < 2}>Start</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...recentTopics, ...TOPICS.filter((t) => !recentTopics.includes(t))].slice(0, 6).map((t) => (
              <button type="button" key={t} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm transition hover:-translate-y-px hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900" onClick={() => start(t)}>{t}</button>
            ))}
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={socratic} onChange={(e) => setSocratic(e.target.checked)} />
            <span><b>Hint mode</b>: Mentora gives hints first and the answer only after you have tried.</span>
          </label>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        </form>
      </section>
      <aside className="space-y-4">
        {due > 0 && (
          <button className="card w-full bg-accent-500/10 p-4 text-left transition hover:-translate-y-0.5" onClick={onDueCards}>
            <p className="font-extrabold">🔁 {due} card{due === 1 ? '' : 's'} to review</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Two minutes now saves an hour later.</p>
          </button>
        )}
        <section className="card p-4">
          <h2 className="font-extrabold">Past sessions</h2>
          {sessions.length === 0 ? <p className="mt-2 text-sm text-slate-500">None yet.</p> : (
            <ul className="mt-2 space-y-1" data-testid="sessions">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => open(s.id)}>
                    <span className="block text-sm font-semibold">{s.topic}{s.mode === 'socratic' ? ' · hints' : ''}</span>
                    <span className="block truncate text-xs text-slate-500">{s.summary || s.last || 'Not started'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function Chat({ initial, onClose }: { initial: Session; onClose: () => void }) {
  const [s, setS] = useState(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [s.messages.length, busy]);

  const reflect = async () => {
    try { setReflection(await api<Reflection>(`/sessions/${s.id}/reflect`, { body: {} })); } catch { /* not critical */ }
  };

  const send = async (content: string) => {
    if (!content.trim() || busy) return;
    setError('');
    setBusy(true);
    setS((x) => ({ ...x, messages: [...x.messages, { role: 'user', content }] }));
    setText('');
    try {
      const out = await api<{ reply: string; used: Memory[]; messagesSinceReflection: number }>(`/sessions/${s.id}/messages`, { body: { content, mode: s.mode } });
      setS((x) => ({ ...x, messages: [...x.messages, { role: 'assistant', content: out.reply, used: out.used }] }));
      if (out.messagesSinceReflection >= REFLECT_EVERY) void reflect();
    } catch (e) {
      setS((x) => ({ ...x, messages: x.messages.slice(0, -1) }));
      setText(content);
      setError(e instanceof Error ? e.message : 'Could not send.');
    } finally { setBusy(false); }
  };

  const finish = async () => {
    setBusy(true);
    await reflect();
    setBusy(false);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <section className="card flex min-h-[70dvh] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div>
            <button className="text-xs font-semibold text-slate-500 hover:underline" onClick={onClose}>← Topics</button>
            <h1 className="text-lg font-extrabold">{s.topic}</h1>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={s.mode === 'socratic'} onChange={(e) => setS({ ...s, mode: e.target.checked ? 'socratic' : 'normal' })} />
            Hint mode
          </label>
        </header>
        <ol className="flex-1 space-y-4 overflow-y-auto p-4" data-testid="chat">
          {s.messages.length === 0 && <li className="py-10 text-center text-sm text-slate-500">Say hi, ask a question, or tell Mentora what you already know about {s.topic}.</li>}
          {s.messages.map((m, i) => (
            <li key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${m.role === 'user' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'}`}>
                {m.role === 'assistant' ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                {m.used && m.used.length > 0 && (
                  <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <summary className="cursor-pointer">Using {m.used.length} thing{m.used.length === 1 ? '' : 's'} I know about you</summary>
                    <ul className="mt-1 space-y-0.5">{m.used.map((u) => <li key={u.id}>{KIND_INFO[u.kind].icon} {u.text}</li>)}</ul>
                  </details>
                )}
              </div>
            </li>
          ))}
          {busy && <li className="flex"><span className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800"><span className="inline-flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 120}ms` }} />)}</span></span></li>}
          <div ref={end} />
        </ol>
        <form className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <textarea className="field min-h-[44px] resize-none" rows={1} value={text} maxLength={2000} placeholder="Type your answer or question…" aria-label="Message"
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text); } }} />
          <button className="btn-primary" disabled={busy || !text.trim()}>Send</button>
        </form>
        {error && <p role="alert" className="px-4 pb-3 text-sm text-rose-600">{error}</p>}
      </section>
      <aside className="space-y-4">
        <section className="card p-4">
          <h2 className="font-extrabold">End of session</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Mentora reviews the chat and updates what it remembers about you. You can change anything on the Memory page.</p>
          <button className="btn-accent mt-3 w-full" onClick={finish} disabled={busy || s.messages.length < 2}>Finish and remember</button>
        </section>
        {reflection && (
          <section className="card p-4" data-testid="reflection" aria-live="polite">
            <h2 className="font-extrabold">What I learned about you</h2>
            {reflection.summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{reflection.summary}</p>}
            <ul className="mt-3 space-y-1.5 text-sm">
              {reflection.added.map((m) => <li key={m.id} className="rounded-lg bg-emerald-50 px-2 py-1 dark:bg-emerald-500/10">＋ {KIND_INFO[m.kind].icon} {m.text}</li>)}
              {reflection.updated.map((m) => <li key={m.id} className="rounded-lg bg-sky-50 px-2 py-1 dark:bg-sky-500/10">✎ {KIND_INFO[m.kind].icon} {m.text}</li>)}
              {reflection.removed.map((m) => <li key={m.id} className="rounded-lg bg-slate-100 px-2 py-1 line-through dark:bg-slate-800">{m.text}</li>)}
              {!reflection.added.length && !reflection.updated.length && !reflection.removed.length && <li className="text-slate-500">Nothing new to remember this time.</li>}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
