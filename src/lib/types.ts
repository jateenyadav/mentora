export type Kind = 'goal' | 'preference' | 'strength' | 'weakness' | 'mistake' | 'fact';
export type Memory = { id: string; kind: Kind; text: string; topic: string | null; source: 'reflection' | 'user'; updatedAt: string };
export type Msg = { role: 'user' | 'assistant'; content: string; used?: Memory[] };
export type Session = { id: string; topic: string; mode: 'normal' | 'socratic'; messages: Msg[]; summary: string | null; updatedAt: string };
export type SessionSummary = { id: string; topic: string; mode: string; summary: string | null; updatedAt: string; last: string | null };
export type Reflection = { added: Memory[]; updated: Memory[]; removed: Memory[]; summary: string };

export const KIND_INFO: Record<Kind, { label: string; icon: string }> = {
  goal: { label: 'Goals', icon: '🎯' },
  preference: { label: 'How you like to learn', icon: '🧭' },
  strength: { label: 'Strong at', icon: '💪' },
  weakness: { label: 'Still tricky', icon: '🧩' },
  mistake: { label: 'Mistakes to watch', icon: '⚠️' },
  fact: { label: 'About you', icon: '🗒️' },
};
export const KINDS = Object.keys(KIND_INFO) as Kind[];
