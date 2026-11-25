// The game's rules and state, with no drawing and no browser in it: the chef, the hand,
// the chopping board and stove, the plate, the order board, the shift timer and the hearts.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react (sounds, announcements) without the world knowing about screens or sound. Nothing
// here allocates after createWorld returns, apart from the small order objects.
import {
  CHEF, CHOP_SECONDS, COOK_SECONDS, DISHES, HEARTS, INGREDIENTS, MAX_ORDERS, NEAR,
  ORDER_PATIENCE, ORDER_SPAWN_EVERY, ORDER_SPAWN_FIRST, ORDER_SPAWN_MIN, SHIFT_SECONDS,
  STATIONS,
} from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_EXPIRE = 2;
export const EVENT_OVER = 4;
export const EVENT_CHOP = 8;
export const EVENT_COOK = 16;
export const EVENT_ERROR = 32;
export const EVENT_GRAB = 64;
export const EVENT_PLACE = 128;

/** The next prep stage for an ingredient at `stage`, or null when it is ready. */
export function nextStage(ing, stage) {
  const chain = INGREDIENTS[ing].chain;
  if (stage === 'raw') return chain.length > 0 ? chain[0] : null;
  const index = chain.indexOf(stage);
  return index >= 0 && index + 1 < chain.length ? chain[index + 1] : null;
}

function sameItem(a, b) {
  return a.ing === b.ing && a.stage === b.stage;
}

function countIn(list, item) {
  let count = 0;
  for (const entry of list) if (sameItem(entry, item)) count += 1;
  return count;
}

export function createWorld(random) {
  const state = {
    chef: { x: 640, targetX: null },
    hand: null,
    process: null,
    plate: [],
    orders: [],
    coins: 0,
    score: 0,
    served: 0,
    hearts: HEARTS,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    spawnTimer: ORDER_SPAWN_FIRST,
    nextOrderId: 1,
    over: false,
    overReason: '',
    message: '',
    messageT: 0,
    lastBonus: 0,
  };

  function reset() {
    state.chef.x = 640;
    state.chef.targetX = null;
    state.hand = null;
    state.process = null;
    state.plate.length = 0;
    state.orders.length = 0;
    state.coins = 0;
    state.score = 0;
    state.served = 0;
    state.hearts = HEARTS;
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.spawnTimer = ORDER_SPAWN_FIRST;
    state.nextOrderId = 1;
    state.over = false;
    state.overReason = '';
    state.message = '';
    state.messageT = 0;
    state.lastBonus = 0;
  }

  function say(text) {
    state.message = text;
    state.messageT = 2.4;
  }

  function spawnOrder() {
    if (state.orders.length >= MAX_ORDERS) return;
    const dishIndex = Math.floor(random() * DISHES.length);
    state.orders.push({
      id: state.nextOrderId,
      dishIndex,
      patience: ORDER_PATIENCE,
      max: ORDER_PATIENCE,
    });
    state.nextOrderId += 1;
  }

  /** The station under the chef, or null when between stations. */
  function nearestStation() {
    let best = null;
    let bestDist = NEAR;
    for (const station of STATIONS) {
      const dist = Math.abs(state.chef.x - station.x);
      if (dist <= bestDist) {
        bestDist = dist;
        best = station;
      }
    }
    return best;
  }

  /** Does any active order still need this exact item on the plate? */
  function plateFits(item) {
    for (const order of state.orders) {
      const needs = DISHES[order.dishIndex].needs;
      if (countIn(needs, item) > countIn(state.plate, item)) return true;
    }
    return false;
  }

  /** Does the plate hold exactly what this order asks for, no more and no less? */
  function plateMatches(order) {
    const needs = DISHES[order.dishIndex].needs;
    if (state.plate.length !== needs.length) return false;
    for (const need of needs) if (countIn(state.plate, need) !== countIn(needs, need)) return false;
    return true;
  }

  function grab(ing) {
    if (state.hand !== null || state.process !== null) return EVENT_ERROR;
    state.hand = { ing, stage: 'raw' };
    return EVENT_GRAB;
  }

  function startChop() {
    if (state.hand === null || state.process !== null) return EVENT_ERROR;
    if (nextStage(state.hand.ing, state.hand.stage) !== 'chopped') return EVENT_ERROR;
    state.process = { kind: 'chop', ing: state.hand.ing, t: 0, dur: CHOP_SECONDS };
    state.hand = null;
    return 0;
  }

  function startCook() {
    if (state.hand === null || state.process !== null) return EVENT_ERROR;
    if (nextStage(state.hand.ing, state.hand.stage) !== 'cooked') return EVENT_ERROR;
    state.process = { kind: 'cook', ing: state.hand.ing, t: 0, dur: COOK_SECONDS };
    state.hand = null;
    return 0;
  }

  function placeOnPlate() {
    if (state.hand === null || state.process !== null) return EVENT_ERROR;
    if (state.plate.length >= 3) return EVENT_ERROR;
    state.plate.push(state.hand);
    state.hand = null;
    return EVENT_PLACE;
  }

  function serveOrder(index) {
    if (index < 0 || index >= state.orders.length) return EVENT_ERROR;
    const order = state.orders[index];
    if (!plateMatches(order)) {
      say('The plate does not match that order yet');
      return EVENT_ERROR;
    }
    const dish = DISHES[order.dishIndex];
    const bonus = Math.floor(order.patience / 10);
    const earned = dish.coins + bonus;
    state.coins += earned;
    state.score += earned * 10;
    state.served += 1;
    state.lastBonus = bonus;
    state.orders.splice(index, 1);
    state.plate.length = 0;
    say(`Served ${dish.name}! +${earned} coins`);
    return EVENT_SERVE;
  }

  function serveFirstMatch() {
    for (let index = 0; index < state.orders.length; index += 1) {
      if (plateMatches(state.orders[index])) return serveOrder(index);
    }
    say('No order matches the plate yet');
    return EVENT_ERROR;
  }

  /** Clear the plate and the hand (the escape when an order walked out mid-dish). */
  function trashPlate() {
    if (state.plate.length === 0 && state.hand === null) return EVENT_ERROR;
    state.plate.length = 0;
    state.hand = null;
    say('Cleared hand and plate');
    return 0;
  }

  /** The contextual action for the station under the chef: grab, chop, cook, place, serve. */
  function act() {
    const station = nearestStation();
    if (station === null) return EVENT_ERROR;
    if (station.kind === 'bin') return grab(station.ing);
    if (station.kind === 'board') return startChop();
    if (station.kind === 'stove') return startCook();
    if (station.kind === 'plate') return placeOnPlate();
    if (station.kind === 'serve') return serveFirstMatch();
    return EVENT_ERROR;
  }

  /** Move the chef instantly (used by the staged screenshot scenes, not by play). */
  function teleport(x) {
    state.chef.x = x;
    state.chef.targetX = null;
  }

  /**
   * One fixed step. `cmd` carries the frame's input: dir (-1, 0, 1), targetX (a mouse walk
   * target, null to keep walking by keys), act, serve (an order index or null), trash, grab
   * (an ingredient id or null). Returns the events that happened, as bit flags.
   */
  function step(dt, cmd) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.messageT > 0) state.messageT = Math.max(0, state.messageT - dt);

    // Walk: a mouse target wins over held keys, and arrival clears the target.
    if (cmd.targetX !== null && cmd.targetX !== undefined) state.chef.targetX = cmd.targetX;
    if (state.chef.targetX !== null) {
      const diff = state.chef.targetX - state.chef.x;
      const move = CHEF.speed * dt;
      if (Math.abs(diff) <= move) {
        state.chef.x = state.chef.targetX;
        state.chef.targetX = null;
      } else {
        state.chef.x += Math.sign(diff) * move;
      }
    } else if (cmd.dir) {
      state.chef.x = Math.min(1246, Math.max(34, state.chef.x + cmd.dir * CHEF.speed * dt));
    }

    // A chop or a cook finishes on its own clock and lands back in the hand.
    if (state.process !== null) {
      state.process.t += dt;
      if (state.process.t >= state.process.dur) {
        const done = state.process;
        state.hand = { ing: done.ing, stage: done.kind === 'chop' ? 'chopped' : 'cooked' };
        state.process = null;
        events |= done.kind === 'chop' ? EVENT_CHOP : EVENT_COOK;
      }
    }

    // Orders arrive on a clock that quickens as the shift wears on.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      const every = Math.max(ORDER_SPAWN_MIN, ORDER_SPAWN_EVERY - Math.floor(state.elapsed / 30));
      state.spawnTimer += every;
    }

    // An order whose patience runs out is lost, and costs a heart.
    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        const dish = DISHES[order.dishIndex];
        state.orders.splice(index, 1);
        state.hearts -= 1;
        say(`${dish.name} walked out! -1 heart`);
        events |= EVENT_EXPIRE;
      }
    }

    if (cmd.grab) events |= grab(cmd.grab);
    if (cmd.act) events |= act();
    if (cmd.serve !== null && cmd.serve !== undefined) events |= serveOrder(cmd.serve);
    if (cmd.trash) events |= trashPlate();

    if (state.hearts <= 0) {
      state.over = true;
      state.overReason = 'The kitchen closed early — too many walkouts.';
      events |= EVENT_OVER;
    } else if (state.timeLeft <= 0) {
      state.over = true;
      state.overReason = 'Shift complete!';
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return {
    state, reset, step, nearestStation, act, grab, serveOrder, serveFirstMatch,
    trashPlate, teleport, plateMatches, plateFits, nextStage,
  };
}
