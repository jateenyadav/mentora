# Mentora

**Live demo:** coming soon (needs free API keys; run it locally in 2 minutes, see below) · [![CI](https://github.com/jateenyadav/mentora/actions/workflows/ci.yml/badge.svg)](https://github.com/jateenyadav/mentora/actions/workflows/ci.yml)

An AI tutor that remembers how you learn.

Learn any topic in a chat. After each session, a reflection step updates what Mentora remembers about you:
- goals
- how you like things explained
- strengths
- weak spots
- specific mistakes

The next session is shaped by it: a learner who likes cricket gets cricket examples, and a mistake you've
made before is pointed out gently. Everything it remembers is on one page, in plain words, and you can
edit or delete it. Click **Try the demo** to meet a learner with a few sessions behind them.

<!-- demo video: docs/demo.mp4 -->

## Features
- **"What I know about you"**: every memory, grouped by kind. Edit, delete, add your own, or
  *Forget everything*. Reflection never overwrites a memory you wrote yourself.
- **Memory that changes the lesson.** Each reply uses the memories most relevant to your message:
  preferences and goals always, the rest ranked by embedding similarity (or word overlap) plus topic and
  recency. A *"Using N things I know about you"* line under every reply shows which ones.
- **Reflection** (zod-checked): add / update / remove, by memory id. Ids that aren't yours are ignored,
  and anything that looks like a phone number, email or password is masked. A memory that was mostly
  contact details is dropped altogether.
- **Hint mode** (Socratic): hints first, and the answer only after two tries.
- **Quick quizzes** aimed at your weak spots and past mistakes. Wrong answers become **review cards**
  scheduled with SM-2 (ported from ExamAce). A progress chart shows quiz scores over time.
- Safe Markdown for replies: React elements only, never `innerHTML`.

## How it works
```
Browser                         Netlify Function (Express)                                   Free AI
───────                         ──────────────────────────                                   ───────
message ──POST /sessions/:id/messages──▶ pick memories (prefs + goals + top-k by cosine/overlap)
                                         system prompt = teaching rules + profile  ──────────▶ Llama 3.3 70B
                                         ◀── reply + the memories used
"Finish" ──POST /sessions/:id/reflect──▶ transcript + memories (with ids) ──────────────────▶ JSON {add, update, remove}
                                         check ids, mask private data, protect your own edits ──▶ MongoDB
quiz ──POST /quiz──▶ questions on weak spots;  wrong answers ──▶ SM-2 cards ──▶ /cards/due, /cards/:id/review
```

## Measured results
In [`scripts/eval.mjs`](scripts/eval.mjs), three scripted student personas (played by an AI) each have a
5-turn session through the real API, and then the reflection step runs. A judge checks how many of each
persona's hidden traits (goal, preference, mistake, strength) ended up in memory. It also checks that a
phone number one persona mentions was **not** stored. Results go in `docs/eval-results.md`. *(Not run
yet: this needs a real Groq key. No numbers are shown until there is a real run.)*

## Key decisions
- **Memory as small, editable sentences**, not a hidden embedding store. You can read and fix it, and
  the prompt stays short.
- **Reflection at the end of a session** (and every 8 messages), not after every message. That's one
  extra AI call per session, not one per message.
- **No code from tutor-gpt** (GPL-3.0): only the idea of a tutor that keeps a theory of the learner.

## Run locally
```bash
npm install
npm run dev        # API on :8888 + web on :5173. No keys needed: in-memory DB + fake AI
npm test           # 17 API + logic tests
npm run test:e2e   # Playwright: lesson → reflection → memory edit → quiz → review card (desktop + phone)
node scripts/eval.mjs   # persona memory test (needs GROQ_API_KEY)
```

## Credits
Inspired by the idea behind [plastic-labs/tutor-gpt](https://github.com/plastic-labs/tutor-gpt) (ideas
only; no code used). This is an independent implementation. The demo learner is made up.

## License
MIT
