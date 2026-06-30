'use strict';

/**
 * KAIROS Timing Engine v0.1
 *
 * Deterministic symbolic timing engine for Quick Timing Check and future
 * Personal Timing Signal drafts.
 *
 * Scope:
 * - Reads the question moment, not fate.
 * - Uses lightweight symbolic layers: present situation, Eastern double-hour,
 *   seasonal rhythm, and Western lunar phase.
 * - Does not provide medical, legal, financial, or emergency advice.
 *
 * This is not a full traditional Chinese almanac implementation. A true Huangli
 * layer requires a curated almanac dataset or licensed calendar API. This module
 * gives the MVP a transparent, deterministic timing method that can later be
 * upgraded without changing the product language.
 */

const SIGNALS = {
  ACT: 'Act',
  WAIT: 'Wait',
  PAUSE: 'Pause',
  PREPARE: 'Prepare',
  ASK: 'Ask clearly',
  REST: 'Rest',
  RESET: 'Reset',
  LET_GO: 'Let go',
  DO_NOT_ACT: 'Do not act today',
  PREPARE_FIRST: 'Prepare first',
  WAIT_CLEARER: 'Wait for a clearer window',
};

const BRANCHES = [
  { key: 'zi', name: 'Zi hour', cn: '子时', element: 'Water', mode: 'inward', meaning: 'midnight water: hidden, inward, better for reflection than impulsive action', bias: { WAIT: 2, REST: 1 } },
  { key: 'chou', name: 'Chou hour', cn: '丑时', element: 'Earth', mode: 'stored', meaning: 'stored earth: slow preparation and consolidation', bias: { PREPARE: 2, WAIT: 1 } },
  { key: 'yin', name: 'Yin hour', cn: '寅时', element: 'Wood', mode: 'emerging', meaning: 'first wood: beginning, emergence, cautious movement', bias: { PREPARE: 1, ACT: 1 } },
  { key: 'mao', name: 'Mao hour', cn: '卯时', element: 'Wood', mode: 'opening', meaning: 'rising wood: communication, gentle opening, first movement', bias: { ASK: 2, ACT: 1 } },
  { key: 'chen', name: 'Chen hour', cn: '辰时', element: 'Earth', mode: 'shaping', meaning: 'wet earth: shaping, planning, gathering form', bias: { PREPARE: 2 } },
  { key: 'si', name: 'Si hour', cn: '巳时', element: 'Fire', mode: 'visible', meaning: 'early fire: visibility, expression, focused movement', bias: { ACT: 1, ASK: 1 } },
  { key: 'wu', name: 'Wu hour', cn: '午时', element: 'Fire', mode: 'intense', meaning: 'full fire: exposure, intensity, decisive but volatile', bias: { ACT: 1, PAUSE: 1 } },
  { key: 'wei', name: 'Wei hour', cn: '未时', element: 'Earth', mode: 'settling', meaning: 'settling earth: adjustment, repair, practical care', bias: { PREPARE: 1, REST: 1 } },
  { key: 'shen', name: 'Shen hour', cn: '申时', element: 'Metal', mode: 'decision', meaning: 'metal movement: decisions, structure, boundaries', bias: { ASK: 1, PREPARE_FIRST: 1 } },
  { key: 'you', name: 'You hour', cn: '酉时', element: 'Metal', mode: 'refining', meaning: 'evening metal: refinement, response, closing loops', bias: { ASK: 1, LET_GO: 1 } },
  { key: 'xu', name: 'Xu hour', cn: '戌时', element: 'Earth', mode: 'closure', meaning: 'dry earth: closure, protection, do not overextend', bias: { LET_GO: 1, WAIT: 1 } },
  { key: 'hai', name: 'Hai hour', cn: '亥时', element: 'Water', mode: 'retreat', meaning: 'night water: retreat, reflection, inner reading', bias: { WAIT: 2, REST: 1 } },
];

const RECENT_PATTERNS = {
  Love: {
    'They went silent': ['Unstable opening', 'Silence plus emotional charge asks for restraint.', { WAIT: 2 }],
    'They replied coldly': ['Blocked exchange', 'The field is cool; forcing warmth may distort the message.', { WAIT: 1, ASK: 1 }],
    'They came back': ['Returning pattern', 'Return is visible, but repair is not yet proven.', { PREPARE_FIRST: 2 }],
    'They watched but did not reply': ['Attention without repair', 'Visibility is present, but contact is not.', { WAIT: 2 }],
    'I almost sent a long message': ['Emotional overflow', 'The message is carrying more feeling than clarity.', { WAIT: 2, DO_NOT_ACT: 1 }],
    'We just had a good conversation': ['Gentle opening', 'The field is open, but should not be overloaded.', { ASK: 1, ACT: 1 }],
  },
  Career: {
    'A new opportunity appeared': ['Emerging opening', 'The window is forming and needs examination.', { PREPARE_FIRST: 2, ACT: 1 }],
    'The team feels tense': ['Tense field', 'Movement now may be read through defensiveness.', { PREPARE: 2, WAIT: 1 }],
    'I feel under-recognized': ['Pressure accumulation', 'The need is real, but the ask needs structure.', { PREPARE: 2, ASK: 1 }],
    'A deadline is close': ['Narrowing window', 'Time pressure is shaping the decision.', { PREPARE_FIRST: 1, ASK: 1 }],
    'I want to leave': ['Reaction window', 'The wish to exit may be true, but the timing may be reactive.', { PREPARE: 2, DO_NOT_ACT: 1 }],
    'I want to ask for more': ['Preparation window', 'The ask needs proof and clean framing.', { PREPARE: 2, ASK: 1 }],
  },
  Wellbeing: {
    'I feel depleted': ['Restoration window', 'Energy is below the threshold for clean action.', { REST: 3 }],
    'I feel blocked': ['Low movement', 'The field is not moving; forcing may create noise.', { RESET: 2, REST: 1 }],
    'I cannot focus': ['Scattered field', 'Attention is fragmented; simplify before deciding.', { RESET: 2, PREPARE: 1 }],
    'I feel restless': ['Unsettled field', 'Movement may be a way to escape discomfort.', { PAUSE: 2 }],
    'I want to reset': ['Reset window', 'A small reset is supported before larger decisions.', { RESET: 3 }],
    'I am forcing myself': ['Resistance signal', 'The body is resisting the current pace.', { REST: 2, DO_NOT_ACT: 1 }],
  },
  Decision: {
    'An opportunity appeared quickly': ['Open but unformed', 'The door is open, but the shape is not complete.', { PREPARE_FIRST: 2 }],
    'A deadline is close': ['Narrowing window', 'The pressure of time is part of the signal.', { ASK: 1, PREPARE_FIRST: 1 }],
    'I feel pressured to choose': ['Pressured field', 'The choice may be shaped by external force.', { PAUSE: 2, PREPARE: 1 }],
    'The situation is unclear': ['Obscured window', 'The signal is mixed and still developing.', { WAIT_CLEARER: 2 }],
    'The door is open but uncertain': ['Threshold window', 'There is an opening, but not a full yes.', { PREPARE_FIRST: 2 }],
    'I need to say yes or no': ['Decision point', 'The moment asks for clarity before commitment.', { ASK: 2 }],
  },
};

const FEELING_BIAS = {
  Urgency: { WAIT: 2, PAUSE: 1 },
  Fear: { DO_NOT_ACT: 2, WAIT: 1 },
  Hope: { PREPARE_FIRST: 1, PREPARE: 1 },
  Pressure: { PREPARE: 2, PAUSE: 1 },
  Confusion: { WAIT_CLEARER: 2, ASK: 1 },
  Calm: { ASK: 1, ACT: 1 },
  Exhaustion: { REST: 2, PREPARE: 1 },
};

const ACTION_BIAS = {
  'Text them': { ASK: 1, WAIT: 1 },
  Wait: { WAIT: 1 },
  'Let go': { LET_GO: 2 },
  'Ask clearly': { ASK: 2 },
  Apply: { PREPARE_FIRST: 1, ACT: 1 },
  Quit: { PREPARE: 2 },
  Launch: { PREPARE_FIRST: 1, ACT: 1 },
  Rest: { REST: 3 },
  'Say yes': { PREPARE_FIRST: 1, ACT: 1 },
  'Say no': { LET_GO: 1, ASK: 1 },
};

function addScores(scores, bias, multiplier = 1) {
  Object.keys(bias || {}).forEach((k) => {
    scores[k] = (scores[k] || 0) + bias[k] * multiplier;
  });
}

function topSignal(scores) {
  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const key = ordered[0] ? ordered[0][0] : 'WAIT';
  return { key, label: SIGNALS[key] || SIGNALS.WAIT, score: ordered[0] ? ordered[0][1] : 0, scores };
}

function getEasternHour(date) {
  const hour = date.getHours();
  const idx = Math.floor(((hour + 1) % 24) / 2);
  return BRANCHES[idx];
}

function getSeasonLayer(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  if (day >= 35 && day < 95) return { name: 'Spring Wood', meaning: 'emergence, first movement, growth before full form', bias: { PREPARE_FIRST: 1, ACT: 1 } };
  if (day >= 95 && day < 157) return { name: 'Late Spring / Early Fire', meaning: 'growth, communication, visibility increasing', bias: { ASK: 1, ACT: 1 } };
  if (day >= 157 && day < 220) return { name: 'Summer Fire', meaning: 'exposure, intensity, expression, visibility', bias: { ACT: 1, PAUSE: 1 } };
  if (day >= 220 && day < 285) return { name: 'Autumn Metal', meaning: 'refinement, decisions, boundaries, cutting what is excess', bias: { ASK: 1, LET_GO: 1 } };
  if (day >= 285 && day < 340) return { name: 'Late Autumn / Early Water', meaning: 'closure, preparation, inward return', bias: { PREPARE: 1, WAIT: 1 } };
  return { name: 'Winter Water', meaning: 'rest, hidden work, reflection, conserving force', bias: { WAIT: 1, REST: 1 } };
}

function getMoonPhase(date) {
  const synodicMonth = 29.53058867;
  const knownNewMoonUTC = Date.UTC(2000, 0, 6, 18, 14);
  let age = ((date.getTime() - knownNewMoonUTC) / 86400000) % synodicMonth;
  if (age < 0) age += synodicMonth;
  let phase;
  let meaning;
  let bias;
  if (age < 1.85 || age > 27.68) {
    phase = 'New / Dark Moon';
    meaning = 'inward, hidden, better for setting intention than forcing action';
    bias = { WAIT: 1, REST: 1 };
  } else if (age < 5.54) {
    phase = 'Waxing Crescent';
    meaning = 'emerging, planting, light first movement';
    bias = { PREPARE_FIRST: 1, ACT: 1 };
  } else if (age < 9.23) {
    phase = 'First Quarter';
    meaning = 'choice point, friction, a need for clear action';
    bias = { ASK: 1, ACT: 1 };
  } else if (age < 12.92) {
    phase = 'Waxing Gibbous';
    meaning = 'refinement, preparation, adjustment before exposure';
    bias = { PREPARE: 2 };
  } else if (age < 16.61) {
    phase = 'Full Moon';
    meaning = 'culmination, visibility, intensity, things are exposed';
    bias = { ACT: 1, PAUSE: 1 };
  } else if (age < 20.3) {
    phase = 'Waning Gibbous';
    meaning = 'integration, response, adjustment after visibility';
    bias = { PREPARE: 1, ASK: 1 };
  } else if (age < 23.99) {
    phase = 'Last Quarter';
    meaning = 'release, correction, clearing what no longer works';
    bias = { LET_GO: 1, RESET: 1 };
  } else {
    phase = 'Waning Crescent';
    meaning = 'rest, withdrawal, closure, returning inward';
    bias = { REST: 1, WAIT: 1, LET_GO: 1 };
  }
  return { phase, age: Number(age.toFixed(2)), meaning, bias };
}

function getPattern(domain, recentSignal) {
  const group = RECENT_PATTERNS[domain] || RECENT_PATTERNS.Decision;
  const row = group[recentSignal] || ['Mixed signal', 'The moment is still forming.', { WAIT: 1 }];
  return { pattern: row[0], reading: row[1], bias: row[2] };
}

function buildText({ domain, action, feeling, recentSignal, pattern, signal, easternHour, season, moon }) {
  let why = pattern.reading;
  if (feeling === 'Urgency') why += ' Urgency is not the same as clarity.';
  if (feeling === 'Fear') why += ' Fear can make an action smaller, harsher, or less true than intended.';
  if (feeling === 'Pressure') why += ' Pressure can turn a real action into a reactive one.';
  if (feeling === 'Calm') why += ' Calm gives the action a cleaner field.';
  if (moon.phase === 'Full Moon' && ['Urgency', 'Pressure', 'Fear'].includes(feeling)) why += ' The lunar layer is intense, so a high-emotion move may be amplified.';

  let bestMove = 'Pause before acting. Let the moment become clearer.';
  let avoid = 'Do not force the moment.';

  if (signal.key === 'WAIT') {
    bestMove = domain === 'Love' ? 'Wait 24 hours. If the feeling becomes quieter, ask one clean question.' : 'Wait for the field to become clearer before taking the next step.';
    avoid = domain === 'Love' ? 'Do not send the paragraph tonight.' : 'Do not act just to end discomfort.';
  } else if (signal.key === 'PREPARE' || signal.key === 'PREPARE_FIRST') {
    bestMove = 'Prepare first: clarify the ask, condition, boundary, or next step before moving.';
    avoid = 'Do not confuse speed with alignment.';
  } else if (signal.key === 'ASK') {
    bestMove = 'Ask one clean question. Keep it simple, bounded, and direct.';
    avoid = 'Do not turn the question into a trial or a performance of pain.';
  } else if (signal.key === 'REST' || signal.key === 'RESET') {
    bestMove = 'Choose a small restoration window before any larger action.';
    avoid = 'Do not force clarity while depleted.';
  } else if (signal.key === 'LET_GO') {
    bestMove = 'Close the loop cleanly. Let the window close without chasing it.';
    avoid = 'Do not reopen the loop just to test whether it still hurts.';
  } else if (signal.key === 'ACT') {
    bestMove = 'Take one clean step. Keep it simple and direct.';
    avoid = 'Do not add more intensity than the moment needs.';
  } else if (signal.key === 'DO_NOT_ACT') {
    bestMove = 'Do not act today. Let the feeling settle before deciding.';
    avoid = 'Do not treat fear or pressure as final truth.';
  } else if (signal.key === 'WAIT_CLEARER') {
    bestMove = 'Ask for one piece of missing information before committing.';
    avoid = 'Do not choose just to escape uncertainty.';
  }

  return {
    intro: `This quick signal reads ${recentSignal.toLowerCase()} with ${feeling.toLowerCase()} around the action: ${action.toLowerCase()}.`,
    why,
    bestMove,
    avoid,
    easternLayer: `The ${easternHour.name} / ${easternHour.cn} suggests ${easternHour.meaning}. The seasonal layer is ${season.name}: ${season.meaning}.`,
    westernLayer: `The ${moon.phase} phase suggests ${moon.meaning}.`,
  };
}

function readQuickTiming(input = {}) {
  const date = input.questionTime ? new Date(input.questionTime) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error('Invalid questionTime. Use an ISO timestamp.');

  const domain = input.domain || 'Decision';
  const action = input.action || 'Wait';
  const feeling = input.feeling || 'Confusion';
  const recentSignal = input.recentSignal || 'The situation is unclear';

  const easternHour = getEasternHour(date);
  const season = getSeasonLayer(date);
  const moon = getMoonPhase(date);
  const pattern = getPattern(domain, recentSignal);

  const scores = {};
  addScores(scores, pattern.bias, 2);
  addScores(scores, FEELING_BIAS[feeling] || FEELING_BIAS.Confusion, 2);
  addScores(scores, ACTION_BIAS[action] || {}, 1.5);
  addScores(scores, easternHour.bias, 1);
  addScores(scores, season.bias, 0.7);
  addScores(scores, moon.bias, 1);

  // Guardrails: these reflect product voice and reduce reckless outputs.
  if (domain === 'Love' && action === 'Text them' && feeling !== 'Calm') addScores(scores, { WAIT: 3, DO_NOT_ACT: 1 });
  if (action === 'Quit' && feeling !== 'Calm') addScores(scores, { PREPARE: 3, DO_NOT_ACT: 1 });
  if (domain === 'Wellbeing' && feeling === 'Exhaustion') addScores(scores, { REST: 4 });
  if (action === 'Say yes' && ['Pressure', 'Confusion', 'Fear'].includes(feeling)) addScores(scores, { PREPARE_FIRST: 3, ASK: 1 });
  if (moon.phase === 'Full Moon' && ['Urgency', 'Pressure', 'Fear'].includes(feeling)) addScores(scores, { PAUSE: 1, WAIT: 1 });

  const signal = topSignal(scores);
  const text = buildText({ domain, action, feeling, recentSignal, pattern, signal, easternHour, season, moon });

  return {
    version: 'kairos-timing-engine-v0.1',
    input: { domain, recentSignal, action, feeling, questionTime: date.toISOString(), timezone: input.timezone || 'local' },
    questionMoment: {
      timestamp: date.toISOString(),
      localHour: date.getHours(),
      weekday: date.getDay(),
    },
    presentMoment: {
      recentSignal,
      emotionalWeather: feeling,
      consideredAction: action,
      timingPattern: pattern.pattern,
      patternReading: pattern.reading,
    },
    easternTiming: {
      hour: easternHour.name,
      branch: easternHour.cn,
      element: easternHour.element,
      mode: easternHour.mode,
      meaning: easternHour.meaning,
      season: season.name,
      seasonMeaning: season.meaning,
    },
    westernTiming: {
      moonPhase: moon.phase,
      moonAgeDays: moon.age,
      meaning: moon.meaning,
    },
    signal: {
      key: signal.key,
      label: signal.label,
      timingPattern: pattern.pattern,
      confidence: signal.score >= 8 ? 'medium-high' : signal.score >= 5 ? 'medium' : 'light',
      scores: signal.scores,
    },
    reading: text,
    boundary: 'KAIROS reads timing, not fate. This quick signal is a symbolic micro-experience, not medical, legal, financial, or emergency advice.',
  };
}

module.exports = {
  readQuickTiming,
  getEasternHour,
  getMoonPhase,
  getSeasonLayer,
  RECENT_PATTERNS,
  SIGNALS,
};
