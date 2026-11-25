// Keyboard and pointer input. Held keys steer the chef; one-shot presses (act, serve,
// trash, pause, restart) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. A click walks the chef to the
// clicked spot — and to a station, where it acts on arrival — or serves the clicked ticket.
import { ING_ORDER, STATIONS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_TRASH = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const TRASH = new Set(['KeyX']);
const GRAB_KEYS = new Map([
  ['Digit1', 'tomato'],
  ['Digit2', 'onion'],
  ['Digit3', 'bread'],
  ['Digit4', 'cheese'],
  ['Digit5', 'mushroom'],
  ['Digit6', 'herb'],
]);

export function createInput(canvas, onTicket) {
  let left = false;
  let right = false;
  let actions = 0;
  let grab = null;
  let clickTarget = null;
  let clickAct = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (TRASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_TRASH;
    } else if (GRAB_KEYS.has(event.code)) {
      if (!event.repeat) grab = GRAB_KEYS.get(event.code);
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const ox = (rect.width - 1280 * scale) / 2;
    const oy = (rect.height - 720 * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    // A click on a ticket serves that order.
    if (point.y >= 10 && point.y <= 86) {
      for (let i = 0; i < 3; i += 1) {
        if (point.x >= 16 + i * 308 && point.x <= 16 + i * 308 + 292) {
          onTicket(i);
          return;
        }
      }
    }
    // A click on a station walks there and acts on arrival; anywhere else just walks.
    let station = null;
    let bestDist = 60;
    for (const candidate of STATIONS) {
      const dist = Math.abs(point.x - candidate.x);
      if (dist < bestDist) {
        bestDist = dist;
        station = candidate;
      }
    }
    const nearRow = (station && station.kind === 'plate') || (station && station.kind === 'serve')
      ? point.y >= 440 && point.y <= 630
      : point.y >= 80 && point.y <= 260;
    if (station && nearRow) {
      clickTarget = station.x;
      clickAct = true;
    } else if (point.y >= 300 && point.y <= 520) {
      clickTarget = Math.min(1246, Math.max(34, point.x));
      clickAct = false;
    } else {
      actions |= ACTION_CONFIRM;
    }
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The ingredient key (1–6) pressed since the last call, or null. */
    takeGrab() {
      const taken = grab;
      grab = null;
      return taken;
    },
    /** A mouse walk target since the last call, with whether to act on arrival. */
    takeClick() {
      if (clickTarget === null) return null;
      const taken = { x: clickTarget, act: clickAct };
      clickTarget = null;
      clickAct = false;
      return taken;
    },
  };
}
