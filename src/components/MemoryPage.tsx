import { useEffect, useState } from 'react';
import { api } from '../api';
import { KINDS, KIND_INFO, type Kind, type Memory } from '../lib/types';

export default function MemoryPage() {
  const [mems, setMems] = useState<Memory[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newKind, setNewKind] = useState<Kind>('goal');
  const [newText, setNewText] = useState('');
  const [error, setError] = useState('');

  const load = () => api<{ memories: Memory[] }>('/memories').then((d) => setMems(d.memories));
  useEffect(() => { void load(); }, []);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
  };

  if (!mems) return <div className="card h-80 animate-pulse" />;
  return (
    <div className="space-y-4">
      <header className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h1 className="text-2xl font-extrabold">What I know about you</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Everything Mentora remembers, in plain words. Edit or delete anything. Your own edits are never overwritten.</p>
        </div>
        {mems.length > 0 && <button className="btn-ghost text-rose-600" onClick={() => window.confirm('Forget everything Mentora knows about you?') && act(() => api('/memories', { method: 'DELETE' }))}>Forget everything</button>}
      </header>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2" data-testid="memories">
        {KINDS.map((k) => {
          const list = mems.filter((m) => m.kind === k);
          return (
            <section key={k} className="card p-4">
              <h2 className="font-extrabold">{KIND_INFO[k].icon} {KIND_INFO[k].label}</h2>
              {list.length === 0 ? <p className="mt-2 text-sm text-slate-500">Nothing yet.</p> : (
                <ul className="mt-2 space-y-1.5">
                  {list.map((m) => (
                    <li key={m.id} className="group rounded-lg border border-slate-100 px-2.5 py-2 text-sm dark:border-slate-800">
                      {editing === m.id ? (
                        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act(() => api(`/memories/${m.id}`, { method: 'PATCH', body: { text: draft } })).then(() => setEditing(null)); }}>
                          <input className="field py-1" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} aria-label="Edit memory" autoFocus />
                          <button className="btn-primary px-3 py-1">Save</button>
                        </form>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="flex-1">{m.text}{m.topic && <span className="ml-1 text-xs text-slate-400">· {m.topic}</span>}{m.source === 'user' && <span className="ml-1 text-xs text-accent-600 dark:text-accent-400">· written by you</span>}</span>
                          <button className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white" onClick={() => { setEditing(m.id); setDraft(m.text); }} aria-label={`Edit: ${m.text}`}>✎</button>
                          <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => act(() => api(`/memories/${m.id}`, { method: 'DELETE' }))} aria-label={`Delete: ${m.text}`}>✕</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <form className="card flex flex-wrap gap-2 p-4" onSubmit={(e) => { e.preventDefault(); void act(() => api('/memories', { body: { kind: newKind, text: newText } })).then(() => setNewText('')); }}>
        <select className="field w-auto" value={newKind} onChange={(e) => setNewKind(e.target.value as Kind)} aria-label="Kind">{KINDS.map((k) => <option key={k} value={k}>{KIND_INFO[k].label}</option>)}</select>
        <input className="field min-w-48 flex-1" value={newText} maxLength={200} onChange={(e) => setNewText(e.target.value)} placeholder="Tell Mentora something, e.g. “I learn best with diagrams”" aria-label="New memory" />
        <button className="btn-primary" disabled={newText.trim().length < 3}>Add</button>
      </form>
    </div>
  );
}
