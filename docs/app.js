import { PRIZES, WINNING_INDEX, SEGMENT_ANGLE, planSpin } from './spin.js';

const svgNamespace = 'http://www.w3.org/2000/svg';
const wheel = document.querySelector('#wheel');
const spinButton = document.querySelector('#spin-button');
const result = document.querySelector('#result');
const termsDialog = document.querySelector('#terms-dialog');
const termsLink = document.querySelector('#terms-link');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const colors = ['#e8bd58', '#dfd1e7', '#c5dace', '#ef8c76', '#e8bd58', '#dfd1e7', '#c5dace', '#ef8c76', '#e8bd58', '#c5dace'];
const labelLines = [
  ['50% off', 'McDonalds', '(or 25% off', 'Five Guys)!'],
  ['An appearance', 'on Eshge', 'Abadi!'],
  ['Saucise', 'pard nakon!'],
  ['An eReader', 'of your', 'choice!'],
  ['Breakfast', 'in bed'],
  ['Breakfast on', 'the toilet'],
  ['Spin again!'],
  ['A cat'],
  ['A zebra'],
  ['British', 'Citizenship'],
];

function svgElement(name, attributes) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function point(angle, radius = 280) {
  const radians = angle * Math.PI / 180;
  return [300 + Math.cos(radians) * radius, 300 + Math.sin(radians) * radius];
}

function buildWheel() {
  const fragment = document.createDocumentFragment();
  PRIZES.forEach((prize, index) => {
    const start = -90 + index * SEGMENT_ANGLE;
    const end = start + SEGMENT_ANGLE;
    const middle = start + SEGMENT_ANGLE / 2;
    const [startX, startY] = point(start);
    const [endX, endY] = point(end);
    fragment.append(svgElement('path', {
      d: `M300 300 L${startX} ${startY} A280 280 0 0 1 ${endX} ${endY} Z`,
      fill: colors[index],
      class: 'wheel-segment',
    }));

    const [x, y] = point(middle, 200);
    // Read from the outside edge, with lines in the broad part of each slice.
    // The label at the top pointer is therefore always upright after a spin.
    const angle = middle + 90;
    const label = svgElement('text', {
      class: 'wheel-label',
      transform: `translate(${x} ${y}) rotate(${angle})`,
      'text-anchor': 'middle',
      'aria-label': prize,
    });
    const lines = labelLines[index];
    lines.forEach((line, lineIndex) => {
      const span = svgElement('tspan', { x: 0, y: (lineIndex - (lines.length - 1) / 2) * 19 + 5 });
      span.textContent = line;
      label.append(span);
    });
    fragment.append(label);
  });
  wheel.replaceChildren(fragment);
}

let rotation = 0;
let spinning = false;
let activeAnimation = null;
let confettiLayer = null;
let confettiAnimations = [];

function clearConfetti() {
  confettiAnimations.forEach((animation) => animation.cancel());
  confettiAnimations = [];
  confettiLayer?.remove();
  confettiLayer = null;
}

function celebrate() {
  clearConfetti();
  if (reducedMotion.matches || !Element.prototype.animate) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  confettiLayer = layer;
  document.body.append(layer);
  const animations = [];
  for (let index = 0; index < 32; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--left', `${Math.random() * 100}%`);
    piece.style.setProperty('--color', colors[index % colors.length]);
    layer.append(piece);
    const animation = piece.animate([
      { transform: 'translate(0, -15px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.random() * 160 - 80}px, ${window.innerHeight + 60}px) rotate(${Math.random() * 600 - 300}deg)`, opacity: 0 },
    ], { duration: 1700 + Math.random() * 900, delay: Math.random() * 240, easing: 'cubic-bezier(.25,.4,.6,1)' });
    animations.push(animation);
  }
  confettiAnimations = animations;
  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    layer.remove();
    if (confettiLayer === layer) {
      confettiLayer = null;
      confettiAnimations = [];
    }
  });
}

function showWinner() {
  const label = document.createElement('span');
  label.className = 'winner-label';
  label.textContent = 'WINNER!';
  const prize = document.createElement('strong');
  prize.textContent = `You won ${PRIZES[WINNING_INDEX][0].toLowerCase()}${PRIZES[WINNING_INDEX].slice(1)}`;
  result.replaceChildren(label, prize);
}

async function spin() {
  if (spinning) return;
  spinning = true;
  spinButton.disabled = true;
  spinButton.textContent = 'BIRTHDAY MAGIC IN PROGRESS…';
  result.textContent = 'The committee is watching the wheel very closely…';
  clearConfetti();
  const plan = planSpin(rotation);
  // Keep the visual angle small between spins; accumulated turns only belong
  // to the animation. Reduced motion goes straight to the same honest result.
  const finalRotation = ((plan.rotation % 360) + 360) % 360;
  try {
    if (!reducedMotion.matches && typeof wheel.animate === 'function') {
      activeAnimation = wheel.animate([
        { transform: `rotate(${rotation}deg)` },
        { transform: `rotate(${plan.rotation}deg)` },
      ], { duration: plan.duration, easing: 'cubic-bezier(.12,.65,.13,1)', fill: 'forwards' });
      await activeAnimation.finished;
    }
  } catch {
    // A cancelled/interrupted animation still resolves to its planned prize.
  } finally {
    wheel.style.transform = `rotate(${finalRotation}deg)`;
    activeAnimation?.cancel();
    activeAnimation = null;
    rotation = finalRotation;
    showWinner();
    spinButton.textContent = 'SPIN AGAIN ↗';
    spinButton.disabled = false;
    spinning = false;
    celebrate();
    if (document.activeElement === document.body && !termsDialog.open) spinButton.focus({ preventScroll: true });
  }
}

let termsOpener = null;
termsLink.addEventListener('click', (event) => {
  event.preventDefault();
  if (termsDialog.open) return;
  // Safari does not always focus a link on tap; restore the actual trigger.
  termsOpener = event.currentTarget;
  termsDialog.showModal();
});
termsDialog.addEventListener('close', () => {
  if (termsOpener instanceof HTMLElement && termsOpener.isConnected) termsOpener.focus({ preventScroll: true });
});
termsDialog.addEventListener('click', (event) => {
  if (event.target !== termsDialog) return;
  const bounds = termsDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) termsDialog.close();
});
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  clearConfetti();
  activeAnimation?.finish();
});
window.addEventListener('pagehide', clearConfetti);

buildWheel();
spinButton.disabled = false;
spinButton.addEventListener('click', spin);
