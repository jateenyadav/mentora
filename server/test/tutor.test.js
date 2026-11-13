import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickMemories, tutorSystem, safeMemoryText, schedule, quizSchema } from '../tutor.js';

const mem = (kind, text, topic = null, extra = {}) => ({ kind, text, topic, updatedAt: new Date(), ...extra });

test('preferences and goals are always used; others ranked by relevance', () => {
  const mems = [mem('preference', 'Likes cricket examples'), mem('weakness', 'Confuses variance and standard deviation', 'Stats'), mem('fact', 'Plays the guitar'), mem('goal', 'Interview in December')];
  const out = pickMemories(mems, { message: 'what is variance?', topic: 'Stats', k: 3 });
  assert.deepEqual(out.map((m) => m.text), ['Likes cricket examples', 'Interview in December', 'Confuses variance and standard deviation']);
});

test('vectors beat word overlap when present', () => {
  const mems = [mem('fact', 'apple', null, { vec: [1, 0] }), mem('fact', 'banana', null, { vec: [0, 1] })];
  assert.equal(pickMemories(mems, { message: 'x', topic: 'y', queryVec: [0, 1], k: 1 })[0].text, 'banana');
});

test('tutor prompt carries the profile and socratic rule', () => {
  const s = tutorSystem({ name: 'Asha', topic: 'Stats', mode: 'socratic', memories: [mem('mistake', 'Forgets to sort first')] });
  assert.match(s, /Past mistakes:\n- Forgets to sort first/);
  assert.match(s, /SOCRATIC MODE/);
  assert.match(tutorSystem({ name: 'Asha', topic: 'Stats', mode: 'normal', memories: [] }), /new learner/);
});

test('contact details and secrets never become memories', () => {
  assert.equal(safeMemoryText('Call 98765 43210 or asha@example.com'), 'Call [number] or [email]');
  assert.equal(safeMemoryText('my password: hunter2 ok'), 'my password [hidden] ok');
});

test('SM-2: good answers stretch the gap, a miss resets it', () => {
  let c = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
  c = schedule(c, 'good'); assert.equal(c.intervalDays, 1);
  c = schedule(c, 'good'); assert.equal(c.intervalDays, 6);
  c = schedule(c, 'good'); assert.equal(c.intervalDays, 15);
  c = schedule(c, 'again'); assert.equal(c.intervalDays, 1); assert.equal(c.lapses, 1); assert.ok(c.ease < 2.5);
});

test('quiz schema accepts a string answer index and needs 4 options', () => {
  assert.equal(quizSchema.safeParse({ questions: [1, 2, 3].map(() => ({ question: 'What is it?', options: ['a', 'b', 'c', 'd'], answer: '2' })) }).data.questions[0].answer, 2);
  assert.equal(quizSchema.safeParse({ questions: [1, 2, 3].map(() => ({ question: 'What is it?', options: ['a', 'b'], answer: 0 })) }).success, false);
});
