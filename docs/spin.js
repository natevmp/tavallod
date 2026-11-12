export const PRIZES = Object.freeze([
  '50% off McDonalds (or 25% off Five Guys)!',
  'An appearance on Eshge Abadi!',
  'Saucise pard nakon!',
  'An eReader of your choice!',
  'Breakfast in bed',
  'Breakfast on the toilet',
  'Apocketfullofsunshine',
  'A cat',
  'A zebra',
  'British Citizenship',
]);

export const WINNING_INDEX = 3;
export const SEGMENT_ANGLE = 360 / PRIZES.length;

const normalize = (angle) => ((angle % 360) + 360) % 360;

// Segment zero starts at twelve o'clock; positive wheel rotation is clockwise.
export function prizeIndexAtRotation(rotation) {
  return Math.floor(normalize(-rotation) / SEGMENT_ANGLE);
}

export function planSpin(currentRotation = 0, random = Math.random) {
  const jitter = (random() * 2 - 1) * SEGMENT_ANGLE * 0.2;
  const target = normalize(-((WINNING_INDEX + 0.5) * SEGMENT_ANGLE + jitter));
  const turns = 5 + Math.floor(random() * 4);
  const duration = 4800 + random() * 1700;
  const remainder = normalize(target - normalize(currentRotation));

  return { rotation: currentRotation + turns * 360 + remainder, duration };
}
