import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

type Q = { question: string; options: string[]; answer: number; explanation: string };
type CardT = { id: string; topic: string; front: string; back: string };
type Progress = { quizzes: { topic: string; score: number; total: number; at: string }[]; memories: number; cards: number; due: number };

export default function Practice({ startWithCards }: { startWithCards: boolean }) {
  const [view, setView] = useState<'quiz' | 'cards'>(startWithCards ? 'cards' : 'quiz');
  return (
    <div className="space-y-4">
      <nav className="inline-flex rounded-2xl bg-white/80 p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-800">
        {(['quiz', 'cards'] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-current={view === v ? 'page' : undefined} className={`rounded-xl px-4 py-1.5 text-sm font-semibold ${view === v ? 'bg-brand-600 text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}>{v === 'quiz' ? 'Quick quiz' : 'Review cards'}</button>)}
      </nav>
      {view === 'quiz' ? <Quiz /> : <Cards />}
      <ProgressChart />
    </div>
  );
}

function Quiz() {
  const [topic, setTopic] = useState('Statistics basics');
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<{ question: string; answer: string; explanation: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setBusy(true); setError(''); setDone(false); setI(0); setScore(0); setWrong([]); setPicked(null);
    try { setQs((await api<{ questions: Q[] }>('/quiz', { body: { topic } })).questions); } catch (e) { setError(e instanceof Error ? e.message : 'Could not make a quiz.'); } finally { setBusy(false); }
  };
  const choose = (k: number) => {
    if (picked !== null || !qs) return;
    setPicked(k);
    const q = qs[i];
    if (k === q.answer) setScore((s) => s + 1);
    else setWrong((w) => [...w, { question: q.question, answer: q.options[q.answer], explanation: q.explanation }]);
  };
  const next = async () => {
    if (!qs) return;
    if (i + 1 < qs.length) { setI(i + 1); setPicked(null); return; }
    setDone(true);
    await api('/quiz/result', { body: { topic, score, total: qs.length, wrong } }).catch(() => {});
  };

  if (!qs || done) {
    return (
      <section className="card p-5">
        {done && qs && <p className="mb-4 rounded-xl bg-brand-50 p-4 text-lg font-extrabold dark:bg-brand-600/10" data-testid="quiz-score">You got {score} of {qs.length}. {wrong.length ? `${wrong.length} review card${wrong.length > 1 ? 's were' : ' was'} added.` : 'Perfect! 🎉'}</p>}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void start(); }}>
          <input className="field" value={topic} maxLength={80} onChange={(e) => setTopic(e.target.value)} aria-label="Quiz topic" />
          <button className="btn-primary whitespace-nowrap" disabled={busy || topic.trim().length < 2}>{busy ? 'Writing…' : done ? 'Another quiz' : 'Start a quiz'}</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Questions focus on the things Mentora knows you find tricky.</p>
        {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
      </section>
    );
  }
  const q = qs[i];
  return (
    <section className="card p-5" data-testid="quiz">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Question {i + 1} of {qs.length}</p>
      <h2 className="mt-1 text-lg font-bold">{q.question}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {q.options.map((o, k) => {
          const state = picked === null ? '' : k === q.answer ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : k === picked ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'opacity-60';
          return <li key={k}><button className={`w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-left font-medium transition hover:border-brand-500 dark:border-slate-700 ${state}`} onClick={() => choose(k)} disabled={picked !== null}>{o}</button></li>;
        })}
      </ul>
      {picked !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{picked === q.answer ? '✅ Correct.' : '❌ Not quite.'} {q.explanation}</p>
          <button className="btn-primary" onClick={next}>{i + 1 < qs.length ? 'Next' : 'See score'}</button>
        </div>
      )}
    </section>
  );
}

function Cards() {
  const [cards, setCards] = useState<CardT[] | null>(null);
  const [flip, setFlip] = useState(false);
  useEffect(() => { api<{ cards: CardT[] }>('/cards/due').then((d) => setCards(d.cards), () => setCards([])); }, []);
  if (!cards) return <div className="card h-48 animate-pulse" />;
  if (!cards.length) return <p className="card p-8 text-center text-slate-500">No cards to review right now. 🎉</p>;
  const c = cards[0];
  const rate = async (rating: string) => {
    await api(`/cards/${c.id}/review`, { body: { rating } });
    setFlip(false);
    setCards(cards.slice(1));
  };
  return (
    <section className="card p-6 text-center" data-testid="card">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.topic} · {cards.length} left</p>
      <p className="mt-3 text-xl font-bold">{c.front}</p>
      {flip ? (
        <>
          <p className="mx-auto mt-4 max-w-lg rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">{c.back}</p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[['again', 'Again', 'bg-rose-600'], ['hard', 'Hard', 'bg-amber-500'], ['good', 'Good', 'bg-emerald-600'], ['easy', 'Easy', 'bg-sky-600']].map(([r, l, cl]) => <button key={r} className={`btn text-white ${cl}`} onClick={() => rate(r)}>{l}</button>)}
          </div>
        </>
      ) : <button className="btn-primary mt-5" onClick={() => setFlip(true)}>Show answer</button>}
    </section>
  );
}

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

function ProgressChart() {
  const [p, setP] = useState<Progress | null>(null);
  const [hover, setHover] = useState<{ t: string; at: string; v: number; x: number; y: number } | null>(null);
  useEffect(() => { api<Progress>('/progress').then(setP, () => {}); }, []);
  const series = useMemo(() => {
    if (!p) return [];
    const byTopic = new Map<string, { at: string; v: number }[]>();
    for (const q of p.quizzes) byTopic.set(q.topic, [...(byTopic.get(q.topic) ?? []), { at: q.at, v: Math.round((q.score / q.total) * 100) }]);
    return [...byTopic.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  }, [p]);
  if (!p) return null;
  const times = p.quizzes.map((q) => new Date(q.at).getTime());
  const t0 = Math.min(...times); const t1 = Math.max(...times, t0 + 86400000);
  const W = 640; const H = 200; const L = 36; const B = 22; const T = 10;
  const x = (at: string) => L + ((new Date(at).getTime() - t0) / (t1 - t0)) * (W - L - 12);
  const y = (v: number) => T + (H - B - T) * (1 - v / 100);
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold">Your progress</h2>
        <p className="text-sm text-slate-500">{p.memories} memories · {p.cards} review cards · {p.due} due</p>
      </div>
      {series.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Take a quiz to see your scores over time.</p> : (
        <>
          {series.length > 1 && <ul className="mt-2 flex gap-4 text-xs">{series.map(([t], k) => <li key={t} className="flex items-center gap-1.5"><span className="h-2 w-4 rounded" style={{ background: SERIES[k] }} />{t}</li>)}</ul>}
          {series.length === 1 && <p className="mt-1 text-sm text-slate-500">Quiz score (%) · {series[0][0]}</p>}
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label="Quiz scores over time" onMouseLeave={() => setHover(null)}>
              {[0, 50, 100].map((v) => <g key={v}><line x1={L} x2={W - 12} y1={y(v)} y2={y(v)} stroke="var(--grid)" /><text x={L - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">{v}%</text></g>)}
              {series.map(([t, pts], k) => (
                <g key={t}>
                  <path d={pts.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.at)},${y(pt.v)}`).join('')} fill="none" stroke={SERIES[k]} strokeWidth={2} />
                  {pts.map((pt, i) => <circle key={i} cx={x(pt.at)} cy={y(pt.v)} r={5} fill={SERIES[k]} stroke="var(--halo)" strokeWidth={2} onMouseEnter={() => setHover({ t, at: pt.at, v: pt.v, x: x(pt.at) / W, y: y(pt.v) / H })} />)}
                </g>
              ))}
            </svg>
            {hover && <div role="tooltip" className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white dark:bg-white dark:text-slate-900" style={{ left: `${hover.x * 100}%`, top: `calc(${hover.y * 100}% - 8px)` }}><b>{hover.v}%</b> · {new Date(hover.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
          </div>
        </>
      )}
    </section>
  );
}
