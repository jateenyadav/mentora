import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { startFakeAi } from '../dev/fake-ai.mjs';
import fixtures from '../dev/fixtures.mjs';
import { createAi, providersFromEnv } from '../lib/ai.js';
import { memoryCounterStore } from '../lib/limits.js';
import { connectDb } from '../lib/db.js';
import { createApp } from '../app.js';

let mem, fake, app;
before(async () => {
  mem = await MongoMemoryServer.create();
  fake = await startFakeAi({ fixtures });
  const ai = createAi({ providers: providersFromEnv({ GROQ_API_KEY: 'x', GROQ_BASE_URL: fake.url, GEMINI_API_KEY: 'x', GEMINI_BASE_URL: fake.url }) });
  app = createApp({ ai, counters: memoryCounterStore(), db: () => connectDb(mem.getUri(), 'mentora-test'), limits: { aiPerDay: 40 } });
});
after(async () => { await mongoose.disconnect(); await mem.stop(); await fake.close(); });

const demo = async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/demo').send({}).expect(201);
  return agent;
};

test('health and the Netlify path', async () => {
  await request(app).get('/api/health').expect(200);
  await request(app).get('/.netlify/functions/api/health').expect(200);
});

test('everything needs a login', async () => {
  await request(app).get('/api/memories').expect(401);
  await request(app).post('/api/sessions').send({ topic: 'Maths' }).expect(401);
});

test('demo learner: memories, a past session, quiz history and due cards', async () => {
  const agent = await demo();
  assert.equal((await agent.get('/api/memories').expect(200)).body.memories.length, 8);
  assert.equal((await agent.get('/api/sessions').expect(200)).body.sessions.length, 1);
  const p = (await agent.get('/api/progress').expect(200)).body;
  assert.equal(p.quizzes.length, 5);
  assert.equal(p.due, 3);
});

test('tutor uses memories, socratic mode changes the reply', async () => {
  const agent = await demo();
  const { body: { session } } = await agent.post('/api/sessions').send({ topic: 'Statistics basics' }).expect(201);
  const a = await agent.post(`/api/sessions/${session.id}/messages`).send({ content: 'When should I use the median?' }).expect(200);
  assert.match(a.body.reply, /you like those/);
  assert.ok(a.body.used.some((m) => /median instead of the mean/.test(m.text)), 'the relevant weakness was used');
  assert.ok(a.body.used.some((m) => m.kind === 'preference'));
  const b = await agent.post(`/api/sessions/${session.id}/messages`).send({ content: 'Give me one', mode: 'socratic' }).expect(200);
  assert.match(b.body.reply, /^Hint/);
  const s = (await agent.get(`/api/sessions/${session.id}`).expect(200)).body.session;
  assert.equal(s.messages.length, 4);
  assert.equal(s.mode, 'socratic');
});

test('reflection adds, updates and protects memories', async () => {
  const agent = await demo();
  const before = (await agent.get('/api/memories').expect(200)).body.memories;
  // The learner edits one memory by hand: reflection must not overwrite it.
  const pref = before.find((m) => m.kind === 'preference');
  await agent.patch(`/api/memories/${pref.id}`).send({ text: 'Prefers short answers with one example.' }).expect(200);
  const { body: { session } } = await agent.post('/api/sessions').send({ topic: 'Statistics basics' }).expect(201);
  await agent.post(`/api/sessions/${session.id}/messages`).send({ content: 'median of 5 3 1?' }).expect(200);
  const r = await agent.post(`/api/sessions/${session.id}/reflect`).send({}).expect(200);
  assert.equal(r.body.added.length, 1, 'the contact-details memory is dropped');
  assert.equal(r.body.added[0].text, 'Now sorts numbers before finding the median.');
  assert.equal(r.body.updated.length, 1);
  assert.equal(r.body.removed.length, 0, 'ids that are not theirs are ignored');
  assert.equal(r.body.summary, 'Practised medians with sorted lists.');
  const again = await agent.post(`/api/sessions/${session.id}/reflect`).send({}).expect(200);
  assert.equal(again.body.added.length, 0, 'nothing new since the last reflection');
  const after = (await agent.get('/api/memories').expect(200)).body.memories;
  assert.equal(after.find((m) => m.id === pref.id).text, 'Prefers short answers with one example.');
});

test('the learner can add, delete and forget everything', async () => {
  const agent = await demo();
  const { body: { memory } } = await agent.post('/api/memories').send({ kind: 'goal', text: 'Pass the CAT exam' }).expect(201);
  assert.equal(memory.source, 'user');
  await agent.delete(`/api/memories/${memory.id}`).expect(200);
  await agent.post('/api/memories').send({ kind: 'secret', text: 'x y z' }).expect(400);
  const wipe = await agent.delete('/api/memories').expect(200);
  assert.equal(wipe.body.deleted, 8);
  assert.equal((await agent.get('/api/memories').expect(200)).body.memories.length, 0);
});

test('quiz → result → wrong answers become review cards → SM-2 review', async () => {
  const agent = await demo();
  const q = await agent.post('/api/quiz').send({ topic: 'Statistics basics' }).expect(200);
  assert.equal(q.body.questions.length, 3);
  assert.equal(q.body.questions[1].answer, 1);
  assert.match(JSON.stringify(fake.calls.at(-1).body.messages), /Unsure when to use the median/, 'quiz focuses on weak spots');
  await agent.post('/api/quiz/result').send({ topic: 'Statistics basics', score: 2, total: 3, wrong: [{ question: 'SD is the square root of…?', answer: 'variance' }] }).expect(201);
  await agent.post('/api/quiz/result').send({ topic: 'x', score: 4, total: 3 }).expect(400);
  const due = (await agent.get('/api/cards/due').expect(200)).body.cards;
  assert.equal(due.length, 4);
  const r = await agent.post(`/api/cards/${due[0].id}/review`).send({ rating: 'good' }).expect(200);
  assert.equal(r.body.intervalDays, 1);
  assert.equal((await agent.get('/api/cards/due').expect(200)).body.cards.length, 3);
});

test('privacy: other users cannot read or change, account deletion removes everything', async () => {
  const owner = request.agent(app);
  await owner.post('/api/auth/register').send({ name: 'Asha', email: 'asha@example.com', password: 'longpassword' }).expect(201);
  const { body: { memory } } = await owner.post('/api/memories').send({ kind: 'goal', text: 'Learn calculus' }).expect(201);
  const { body: { session } } = await owner.post('/api/sessions').send({ topic: 'Calculus' }).expect(201);
  const stranger = await demo();
  await stranger.patch(`/api/memories/${memory.id}`).send({ text: 'hacked text' }).expect(404);
  await stranger.get(`/api/sessions/${session.id}`).expect(404);
  await stranger.post(`/api/sessions/${session.id}/messages`).send({ content: 'hi' }).expect(404);
  const me = await owner.get('/api/auth/me').expect(200);
  await owner.delete('/api/auth/account').send({ password: 'longpassword' }).expect(200);
  for (const c of ['memories', 'tsessions', 'cards', 'quizresults']) assert.equal(await mongoose.connection.collection(c).countDocuments({ userId: me.body.user.id }), 0, c);
});
