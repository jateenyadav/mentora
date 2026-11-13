// Canned answers for the fake AI (local dev + tests). The first key found in the prompt wins.
export default {
  'You maintain a tutor': (body) => {
    // Find a real memory id in the prompt so update/remove can be tested.
    const ids = [...JSON.stringify(body.messages).matchAll(/\\n([0-9a-f]{24}) \[(\w+)\]/g)].map((m) => ({ id: m[1], kind: m[2] }));
    const weakness = ids.find((x) => x.kind === 'weakness');
    return {
      add: [{ kind: 'strength', text: 'Now sorts numbers before finding the median.' }, { kind: 'fact', text: 'Call me on 98765 43210 or mail asha@example.com' }],
      update: weakness ? [{ id: weakness.id, text: 'Getting better at choosing median vs mean.' }] : [],
      remove: ['000000000000000000000000'], // not theirs: ignored
      summary: 'Practised medians with sorted lists.',
    };
  },
  'multiple-choice questions on': {
    questions: [
      { question: 'Median of 3, 1, 2?', options: ['1', '2', '3', '6'], answer: 1, explanation: 'Sort: 1, 2, 3.' },
      { question: 'Mean of 2 and 4?', options: ['2', '3', '4', '6'], answer: '1', explanation: '(2+4)/2' },
      { question: 'SD is the square root of…?', options: ['mean', 'median', 'variance', 'range'], answer: 2 },
    ],
  },
  'You are Mentora': (body) => {
    const sys = body.messages[0].content;
    return sys.includes('SOCRATIC') ? 'Hint: what do you do with the numbers first?' : `Let us try a cricket example${sys.includes('cricket') ? ' (you like those)' : ''}.`;
  },
};
