// "Try the demo": a learner who has already had a few sessions, so the memory, quiz history and review
// cards are there to explore. Written for this app; the learner is made up.

export const DEMO_TOPIC = 'Statistics basics';

export const DEMO_MEMORIES = [
  ['goal', 'Wants to understand statistics for a data analyst job interview in December.', DEMO_TOPIC],
  ['preference', 'Learns best from a small worked example first, then the rule.', null],
  ['preference', 'Likes cricket examples.', null],
  ['strength', 'Calculates the mean quickly and correctly.', DEMO_TOPIC],
  ['weakness', 'Unsure when to use the median instead of the mean.', DEMO_TOPIC],
  ['mistake', 'Forgot to sort the numbers before finding the median.', DEMO_TOPIC],
  ['weakness', 'Confuses standard deviation with variance.', DEMO_TOPIC],
  ['fact', 'Is comfortable with Excel but new to Python.', null],
];

export const DEMO_SESSION = [
  ['user', 'What is the median of 7, 2, 9, 4?'],
  ['assistant', 'Let’s do it like a scorecard. First sort the scores: **2, 4, 7, 9**. With an even count, the median is the average of the two middle values: (4 + 7) / 2 = **5.5**. Your turn: what is the median of 30, 12, 45?'],
  ['user', 'Is it 12?'],
  ['assistant', 'Close, but remember to sort first: 12, 30, 45. The middle one is **30**. Sorting first is the step that is easy to skip. Try one more: 50, 10, 20, 40, 30?'],
  ['user', '30'],
  ['assistant', 'Exactly right! 🎯 Next time we’ll see when the median beats the mean, using a batting average with one huge innings.'],
];

/** Quiz history over the past weeks: [days ago, score, total]. */
export const DEMO_QUIZZES = [[20, 2, 5], [14, 3, 5], [9, 3, 5], [4, 4, 5], [1, 4, 5]];

export const DEMO_CARDS = [
  ['What is the first step before finding the median?', 'Sort the numbers from smallest to largest.'],
  ['When is the median a better summary than the mean?', 'When there are outliers or the data is skewed (one huge value pulls the mean).'],
  ['How are variance and standard deviation related?', 'Standard deviation is the square root of the variance.'],
];
