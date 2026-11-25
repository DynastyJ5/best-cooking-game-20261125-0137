// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order sequence. ?shot=start|play|serve|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CHOP, EVENT_COOK, EVENT_ERROR, EVENT_EXPIRE, EVENT_OVER, EVENT_SERVE } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_TRASH, createInput,
} from './input.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// The canvas backing store must match its displayed size (times the device pixel ratio),
// or the renderer paints into the default 300x150 store and the browser upscales a blur.
function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// --- Sound: tiny WebAudio synth, no files. Created on the first user gesture. ---
let audio = null;
function ensureAudio() {
  if (audio) return audio;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio = new Ctx();
  } catch {
    audio = null;
  }
  return audio;
}
function blip(freq, dur, type, gainValue) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    // Sound is garnish: a failed blip never stops the game.
  }
}
function chopSound() {
  blip(180, 0.08, 'square', 0.1);
  setTimeout(() => blip(140, 0.08, 'square', 0.1), 90);
}
function serveSound() {
  blip(660, 0.12, 'sine', 0.14);
  setTimeout(() => blip(880, 0.18, 'sine', 0.14), 110);
}
function errorSound() {
  blip(110, 0.18, 'sawtooth', 0.08);
}
function expireSound() {
  blip(220, 0.25, 'triangle', 0.12);
  setTimeout(() => blip(160, 0.3, 'triangle', 0.12), 160);
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingClickAct = false;
  const input = createInput(canvas, (ticketIndex) => {
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(0, { dir: 0, targetX: null, act: false, serve: ticketIndex, trash: false, grab: null });
    if (events & EVENT_SERVE) serveSound();
    else errorSound();
  });

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    ensureAudio();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve every order before its patience runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. ${world.state.served} dishes served, ${world.state.coins} coins, score ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const grab = input.takeGrab();
    const click = input.takeClick();
    if (click) {
      world.step(0, { dir: 0, targetX: click.x, act: false, serve: null, trash: false, grab: null });
      pendingClickAct = click.act;
    }
    if (actions & ACTION_RESTART && screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) {
      if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_TRASH) {
      world.step(0, { dir: 0, targetX: null, act: false, serve: null, trash: true, grab: null });
    }
    if (grab) {
      const events = world.step(0, { dir: 0, targetX: null, act: false, serve: null, trash: false, grab });
      if (events & EVENT_ERROR) errorSound();
      else blip(520, 0.07, 'sine', 0.1);
    }
    if (actions & ACTION_CONFIRM) {
      const events = world.step(0, { dir: 0, targetX: null, act: true, serve: null, trash: false, grab: null });
      if (events & EVENT_SERVE) serveSound();
      else if (events & EVENT_ERROR) errorSound();
      else if (events & EVENT_CHOP) chopSound();
      else blip(440, 0.06, 'sine', 0.08);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dir: 0, targetX: null, act: false, serve: null, trash: false, grab: null });
      return;
    }
    const click = pendingClickAct && world.state.chef.targetX === null;
    const events = world.step(STEP, {
      dir: input.direction(),
      targetX: null,
      act: click,
      serve: null,
      trash: false,
      grab: null,
    });
    if (click) pendingClickAct = false;
    if (events & EVENT_SERVE) serveSound();
    else if (events & EVENT_EXPIRE) expireSound();
    else if (events & EVENT_CHOP) chopSound();
    else if (events & EVENT_COOK) blip(300, 0.1, 'sine', 0.08);
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Copper Ladle Kitchen. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
