// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real rules
// forward from a fresh world, steered by a small autopilot that grabs, chops, cooks, plates
// and serves exactly as a player would, so every frame is what a real game looks like and
// the same seed always gives the same frame.
import { DISHES, INGREDIENTS, NEAR, STEP, STATIONS } from './config.js';
import { EVENT_OVER, nextStage } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 400;

function stationFor(kind, ing) {
  return STATIONS.find((s) => s.kind === kind && (ing === undefined || s.ing === ing));
}

function binFor(ing) {
  return stationFor('bin', ing);
}

/** Where the chef must stand to work on the item in hand, or to fetch `need`. The hand
 * item stops at the stage its order asks for — a tomato for a chopped-tomato dish is
 * never cooked past chopped. */
function targetNeedForHand(world) {
  const state = world.state;
  if (!state.hand) return null;
  for (const order of state.orders) {
    const needs = DISHES[order.dishIndex].needs;
    for (const need of needs) {
      if (need.ing !== state.hand.ing) continue;
      const onPlate = state.plate.filter((p) => p.ing === need.ing && p.stage === need.stage).length;
      const wanted = needs.filter((n) => n.ing === need.ing && n.stage === need.stage).length;
      if (onPlate >= wanted) continue;
      if (reachableStages(state.hand.ing, state.hand.stage).includes(need.stage)) return need;
    }
  }
  return null;
}

function goalFor(world, need) {
  const state = world.state;
  if (state.hand) {
    const target = targetNeedForHand(world);
    if (!target) return null;
    if (state.hand.stage === target.stage) return stationFor('plate');
    const next = nextStage(state.hand.ing, state.hand.stage);
    if (next === 'chopped') return stationFor('board');
    if (next === 'cooked') return stationFor('stove');
    return stationFor('plate');
  }
  if (need) return binFor(need.ing);
  return null;
}

/** The first thing the plate still needs for the first order that can use it. */
function nextNeed(world) {
  const state = world.state;
  for (const order of state.orders) {
    const needs = DISHES[order.dishIndex].needs;
    for (const need of needs) {
      const onPlate = state.plate.filter((p) => p.ing === need.ing && p.stage === need.stage).length;
      const wanted = needs.filter((n) => n.ing === need.ing && n.stage === need.stage).length;
      if (onPlate < wanted) return need;
    }
  }
  return null;
}

function plateMatchesAny(world) {
  return world.state.orders.some((order) => world.plateMatches(order));
}

/** The stages the hand item can still reach (its current stage and every later one). */
function reachableStages(ing, stage) {
  const chain = INGREDIENTS[ing].chain;
  const start = stage === 'raw' ? -1 : chain.indexOf(stage);
  const stages = [stage];
  for (let i = start + 1; i < chain.length; i += 1) stages.push(chain[i]);
  return stages;
}

function isSubset(items, needs) {
  for (const item of items) {
    const onPlate = items.filter((p) => p.ing === item.ing && p.stage === item.stage).length;
    const wanted = needs.filter((n) => n.ing === item.ing && n.stage === item.stage).length;
    if (onPlate > wanted) return false;
  }
  return true;
}

/**
 * Can the plate plus the hand item (at some stage it can still reach) still become
 * some active order? When an order walks out mid-dish the answer turns to no, and the
 * only way forward is to clear the hand and the plate.
 */
function leadsSomewhere(world) {
  const state = world.state;
  if (state.plate.length === 0 && state.hand === null) return true;
  for (const order of state.orders) {
    const needs = DISHES[order.dishIndex].needs;
    if (state.hand === null) {
      if (isSubset(state.plate, needs)) return true;
      continue;
    }
    for (const stage of reachableStages(state.hand.ing, state.hand.stage)) {
      if (isSubset([...state.plate, { ing: state.hand.ing, stage }], needs)) return true;
    }
  }
  return false;
}

/** One autopilot step: walk to the goal station and act on arrival, or wait out a process. */
function autopilot(world) {
  const state = world.state;
  if (state.process) return { dir: 0, targetX: null, act: false, serve: null, trash: false, grab: null };
  if ((state.hand !== null || state.plate.length > 0) && !leadsSomewhere(world)) {
    return { dir: 0, targetX: null, act: false, serve: null, trash: true, grab: null };
  }
  if (plateMatchesAny(world)) {
    const serve = stationFor('serve');
    if (Math.abs(state.chef.x - serve.x) <= NEAR) return { dir: 0, targetX: null, act: true, serve: null, trash: false, grab: null };
    return { dir: 0, targetX: serve.x, act: false, serve: null, trash: false, grab: null };
  }
  const need = nextNeed(world);
  if (!need && !state.hand) return { dir: 0, targetX: null, act: false, serve: null, trash: false, grab: null };
  const goal = goalFor(world, need);
  if (!goal) {
    // The hand holds something no order can still use: clear it rather than stand still.
    if (state.hand) return { dir: 0, targetX: null, act: false, serve: null, trash: true, grab: null };
    return { dir: 0, targetX: null, act: false, serve: null, trash: false, grab: null };
  }
  if (Math.abs(state.chef.x - goal.x) <= NEAR) {
    return { dir: 0, targetX: null, act: true, serve: null, trash: false, grab: null };
  }
  return { dir: 0, targetX: goal.x, act: false, serve: null, trash: false, grab: null };
}

/** Step the world for `seconds` of play, driven by the autopilot. */
function drive(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    if (world.step(STEP, autopilot(world)) & EVENT_OVER) break;
  }
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dir: 0, targetX: null, act: false, serve: null, trash: false, grab: null });
    }
    // Step the chef aside so he never covers the title text.
    world.teleport(170);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    drive(world, END_LIMIT_SECONDS);
    // Step the chef aside so he never covers the final score.
    world.teleport(170);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'serve') {
    // Play until a plate is finished and waiting at the serve window.
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      if (plateMatchesAny(world)) break;
      if (world.step(STEP, autopilot(world)) & EVENT_OVER) break;
    }
    world.teleport(stationFor('serve').x);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // Play until a dish is mid-assembly on the plate (and the shift is under way), so the
  // frame shows the kitchen at work rather than an empty plate between dishes.
  for (let index = 0; index < 90 / STEP; index += 1) {
    if (world.state.plate.length >= 1 && world.state.elapsed > 8) break;
    if (world.step(STEP, autopilot(world)) & EVENT_OVER) break;
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
