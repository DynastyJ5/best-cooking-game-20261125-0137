// All drawing, and nothing else: the kitchen, the order board, the chef, the stations,
// the tickets, the timer and the screens. Every picture is drawn from shapes, so the game
// needs no image files and no network.
import {
  CHEF, DISHES, FIELD, FONT, INGREDIENTS, ING_ORDER, MAX_ORDERS, PALETTE, STATIONS,
} from './config.js';
import { nextStage } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 600} ${size}px ${FONT}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function heart(ctx, x, y, size, filled) {
  ctx.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size * 0.6, y - size * 0.25, x - size * 0.25, y - size * 0.7, x, y - size * 0.2);
  ctx.bezierCurveTo(x + size * 0.25, y - size * 0.7, x + size * 0.6, y - size * 0.25, x, y + size * 0.35);
  ctx.closePath();
  ctx.fill();
}

function star(ctx, x, y, size, filled) {
  ctx.fillStyle = filled ? PALETTE.gold : '#d8cbb6';
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? size : size * 0.45;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function coinIcon(ctx, x, y, r) {
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8932a';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'C', x, y + r * 0.55, Math.round(r * 1.1), '#8a6d1f', 800, 'center');
}

function clockIcon(ctx, x, y, r) {
  ctx.fillStyle = '#fff3dd';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.text;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - r * 0.55);
  ctx.moveTo(x, y);
  ctx.lineTo(x + r * 0.45, y);
  ctx.stroke();
}

/** One ingredient, drawn at (x, y) as its centre, radius r, in its prep stage. */
export function drawIngredient(ctx, ing, x, y, r, stage) {
  const def = INGREDIENTS[ing];
  const cooked = stage === 'cooked';
  const chopped = stage === 'chopped';
  ctx.save();
  ctx.translate(x, y);
  if (ing === 'tomato') {
    ctx.fillStyle = cooked ? '#b23a2e' : def.color;
    ctx.beginPath();
    if (chopped) {
      ctx.arc(-r * 0.45, 0, r * 0.55, 0, Math.PI * 2);
      ctx.arc(r * 0.45, 0, r * 0.55, 0, Math.PI * 2);
    } else ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7a3e';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(-r * 0.45, -r * 1.15);
    ctx.lineTo(0, -r * 0.9);
    ctx.lineTo(r * 0.45, -r * 1.15);
    ctx.lineTo(0, -r * 0.7);
    ctx.fill();
  } else if (ing === 'onion') {
    if (chopped) {
      ctx.strokeStyle = cooked ? '#c98f2e' : '#e8d5f2';
      ctx.lineWidth = r * 0.28;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(i * r * 0.5, 0, r * 0.7, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = cooked ? '#d9a441' : def.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (ing === 'bread') {
    ctx.fillStyle = cooked ? '#b57a35' : def.color;
    rr(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.5);
    ctx.fill();
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.35);
    ctx.lineTo(r * 0.5, -r * 0.35);
    ctx.moveTo(-r * 0.5, r * 0.1);
    ctx.lineTo(r * 0.5, r * 0.1);
    ctx.stroke();
  } else if (ing === 'cheese') {
    ctx.fillStyle = cooked ? '#e8a91c' : def.color;
    ctx.beginPath();
    if (chopped) {
      ctx.moveTo(-r, r * 0.6);
      ctx.lineTo(-r * 0.2, -r * 0.7);
      ctx.lineTo(r * 0.4, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.1, r * 0.7);
      ctx.lineTo(r * 0.7, -r * 0.4);
      ctx.lineTo(r, r * 0.7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(-r, r * 0.7);
      ctx.lineTo(r, -r * 0.7);
      ctx.lineTo(r, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(138,109,31,0.55)';
      ctx.beginPath();
      ctx.arc(r * 0.35, r * 0.2, r * 0.16, 0, Math.PI * 2);
      ctx.arc(-r * 0.1, r * 0.35, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'mushroom') {
    if (chopped) {
      ctx.fillStyle = cooked ? '#a86a3f' : '#efe3d3';
      for (let i = -1; i <= 1; i += 1) {
        rr(ctx, i * r * 0.55 - r * 0.32, -r * 0.5, r * 0.64, r, r * 0.3);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = cooked ? '#8a5a3a' : '#a85b3a';
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f3e6d4';
      rr(ctx, -r * 0.28, -r * 0.2, r * 0.56, r * 0.9, r * 0.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(-r * 0.4, -r * 0.55, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 0.75, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'herb') {
    ctx.strokeStyle = cooked ? '#3c6b2f' : def.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (chopped) {
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
        ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
        ctx.stroke();
      }
    } else {
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.45, r * 0.8);
        ctx.quadraticCurveTo(i * r * 0.5, 0, i * r * 0.55 - r * 0.3, -r * 0.8);
        ctx.stroke();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(i * r * 0.5 - r * 0.25, -r * 0.3, r * 0.3, r * 0.14, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (cooked) {
    // Steam wisps over a cooked ingredient.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 1.1);
    ctx.quadraticCurveTo(-r * 0.1, -r * 1.5, -r * 0.3, -r * 1.8);
    ctx.moveTo(r * 0.3, -r * 1.1);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.3, -r * 1.8);
    ctx.stroke();
  }
  ctx.restore();
}

function stageWord(stage) {
  return stage === 'raw' ? 'raw' : stage;
}

function drawTicket(ctx, order, x, y, w, h, now) {
  const dish = DISHES[order.dishIndex];
  const frac = Math.max(0, order.patience / order.max);
  const urgent = frac < 0.35;
  ctx.fillStyle = PALETTE.ticket;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = urgent && Math.floor(now * 4) % 2 === 0 ? '#c0392b' : PALETTE.ticketEdge;
  ctx.lineWidth = urgent ? 3 : 1.5;
  ctx.stroke();
  text(ctx, dish.name, x + 12, y + 20, 15, PALETTE.text, 700);
  coinIcon(ctx, x + w - 26, y + 16, 10);
  text(ctx, String(dish.coins), x + w - 40, y + 20, 14, PALETTE.text, 700, 'right');
  const iconY = y + 42;
  const gap = (w - 24) / 3;
  dish.needs.forEach((need, i) => {
    const cx = x + 12 + gap * (i + 0.5);
    drawIngredient(ctx, need.ing, cx, iconY, 12, need.stage);
    text(ctx, stageWord(need.stage), cx, iconY + 20, 9, PALETTE.muted, 600, 'center');
  });
  ctx.fillStyle = '#e8dcc4';
  rr(ctx, x + 10, y + h - 10, w - 20, 6, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? PALETTE.timerGood : frac > 0.25 ? PALETTE.timerWarn : PALETTE.timerBad;
  rr(ctx, x + 10, y + h - 10, (w - 20) * frac, 6, 3);
  ctx.fill();
}

function drawChef(ctx, x, y, hand, walking, now) {
  const bob = walking ? Math.sin(now * 14) * 2 : Math.sin(now * 2) * 1;
  ctx.save();
  ctx.translate(x, y + bob * 0.4);
  // Legs and shoes.
  ctx.fillStyle = '#3a3f4a';
  rr(ctx, -16, -18, 13, 18, 4);
  ctx.fill();
  rr(ctx, 3, -18, 13, 18, 4);
  ctx.fill();
  // Apron body over a teal shirt.
  ctx.fillStyle = '#2e7f86';
  rr(ctx, -24, -62, 48, 48, 10);
  ctx.fill();
  ctx.fillStyle = '#f7f2e7';
  rr(ctx, -18, -58, 36, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#2e7f86';
  rr(ctx, -18, -58, 36, 10, 5);
  ctx.fill();
  // Arms reaching forward, holding the hand item.
  ctx.strokeStyle = '#2e7f86';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, -48);
  ctx.lineTo(6, -34);
  ctx.moveTo(20, -48);
  ctx.lineTo(6, -34);
  ctx.stroke();
  // Head and toque.
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(0, -74, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-9, -88, 9, 0, Math.PI * 2);
  ctx.arc(0, -93, 10, 0, Math.PI * 2);
  ctx.arc(9, -88, 9, 0, Math.PI * 2);
  ctx.fill();
  rr(ctx, -14, -90, 28, 8, 4);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#2b1d12';
  ctx.beginPath();
  ctx.arc(-5, -75, 1.8, 0, Math.PI * 2);
  ctx.arc(5, -75, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (hand) {
    drawIngredient(ctx, hand.ing, 6, -30, 13, hand.stage);
    text(ctx, stageWord(hand.stage), 6, -8, 9, '#fff3dd', 700, 'center');
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const W = FIELD.width;
  const H = FIELD.height;

  function fit() {
    const scale = Math.min(canvas.width / W, canvas.height / H);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - W * scale) / 2, (canvas.height - H * scale) / 2);
  }

  function drawKitchen(state, now) {
    // Wall and floor.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, W, 300);
    ctx.fillStyle = PALETTE.wallTrim;
    ctx.fillRect(0, 296, W, 6);
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 302, W, H - 302);
    ctx.fillStyle = PALETTE.floorDark;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(col * 160 + (row % 2) * 80 - 80, 320 + row * 80, 80, 80);
      }
    }
    // Wall decor: a row of hanging pans on the strip between the order board and the
    // back counter, on the free wall right of the stove.
    for (let i = 0; i < 3; i += 1) {
      const px = 1186 + i * 36;
      ctx.strokeStyle = '#5d3a1e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, 126, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, 114);
      ctx.lineTo(px, 100);
      ctx.stroke();
    }

    // Back counter with the ingredient bins, board and stove.
    ctx.fillStyle = PALETTE.counterTop;
    rr(ctx, 24, 150, W - 48, 26, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterFront;
    ctx.fillRect(24, 176, W - 48, 74);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 1; i < 6; i += 1) ctx.fillRect(24 + i * 208, 176, 2, 74);

    for (const station of STATIONS) {
      if (station.kind !== 'bin') continue;
      const def = INGREDIENTS[station.ing];
      // Crate.
      ctx.fillStyle = '#c98f4e';
      rr(ctx, station.x - 42, 108, 84, 48, 6);
      ctx.fill();
      ctx.strokeStyle = '#8a5a33';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawIngredient(ctx, station.ing, station.x - 18, 132, 13, 'raw');
      drawIngredient(ctx, station.ing, station.x + 14, 132, 13, 'raw');
      text(ctx, def.name, station.x, 178 - 8 + 8, 11, '#f7ead2', 700, 'center');
      text(ctx, station.key, station.x, 196, 11, '#d9c48f', 700, 'center');
    }

    // Chopping board.
    const board = STATIONS.find((s) => s.id === 'board');
    ctx.fillStyle = '#e8c88f';
    rr(ctx, board.x - 48, 118, 96, 34, 6);
    ctx.fill();
    ctx.strokeStyle = '#b8932a';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (state.process && state.process.kind === 'chop') {
      drawIngredient(ctx, state.process.ing, board.x, 135, 14, 'raw');
      const frac = state.process.t / state.process.dur;
      ctx.fillStyle = '#2f7a3e';
      rr(ctx, board.x - 40, 158, 80 * frac, 6, 3);
      ctx.fill();
    }
    text(ctx, 'CHOP', board.x, 186, 11, '#f7ead2', 700, 'center');
    text(ctx, 'Space', board.x, 202, 11, '#d9c48f', 700, 'center');

    // Stove with a pot.
    const stove = STATIONS.find((s) => s.id === 'stove');
    ctx.fillStyle = '#3a3f4a';
    rr(ctx, stove.x - 52, 118, 104, 38, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.steel;
    ctx.beginPath();
    ctx.arc(stove.x - 22, 132, 15, 0, Math.PI * 2);
    ctx.arc(stove.x + 22, 132, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(stove.x - 22, 132, 6, 0, Math.PI * 2);
    ctx.arc(stove.x + 22, 132, 6, 0, Math.PI * 2);
    ctx.fill();
    if (state.process && state.process.kind === 'cook') {
      ctx.fillStyle = '#5d6b7a';
      rr(ctx, stove.x - 30, 96, 60, 24, 8);
      ctx.fill();
      ctx.fillStyle = '#e8a91c';
      ctx.beginPath();
      ctx.arc(stove.x - 8, 104, 5, 0, Math.PI * 2);
      ctx.arc(stove.x + 10, 100, 4, 0, Math.PI * 2);
      ctx.fill();
      const frac = state.process.t / state.process.dur;
      ctx.fillStyle = '#c0392b';
      rr(ctx, stove.x - 40, 158, 80 * frac, 6, 3);
      ctx.fill();
    }
    text(ctx, 'STOVE', stove.x, 186, 11, '#f7ead2', 700, 'center');
    text(ctx, 'Space', stove.x, 202, 11, '#d9c48f', 700, 'center');

    // Front counter: plate station and serve window.
    ctx.fillStyle = PALETTE.counterTop;
    rr(ctx, 24, 520, W - 48, 26, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterFront;
    ctx.fillRect(24, 546, W - 48, 74);
    const plate = STATIONS.find((s) => s.id === 'plate');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(plate.x, 530, 52, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9ced6';
    ctx.lineWidth = 2;
    ctx.stroke();
    state.plate.forEach((item, i) => {
      drawIngredient(ctx, item.ing, plate.x - 26 + i * 26, 522, 12, item.stage);
    });
    text(ctx, 'PLATE', plate.x, 578, 11, '#f7ead2', 700, 'center');
    text(ctx, 'Space to add', plate.x, 594, 11, '#d9c48f', 700, 'center');
    const serve = STATIONS.find((s) => s.id === 'serve');
    ctx.fillStyle = '#2b1d12';
    rr(ctx, serve.x - 70, 470, 140, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#fff3dd';
    text(ctx, 'SERVE', serve.x, 494, 15, '#fff3dd', 800, 'center');
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(serve.x, 512, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(serve.x - 12, 510, 24, 4);
    text(ctx, 'Enter', serve.x, 578, 11, '#f7ead2', 700, 'center');
    text(ctx, 'X clears hand + plate', 640, 594, 11, '#d9c48f', 700, 'center');

    // The chef, walking the aisle.
    const walking = state.chef.targetX !== null;
    drawChef(ctx, state.chef.x, CHEF.y + 62, state.hand, walking, now);

    // Nearest-station glow, so the player always sees what Space will do.
    const near = nearestStationOf(state);
    if (near && !state.over) {
      ctx.strokeStyle = 'rgba(242,201,76,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      rr(ctx, near.x - 52, near.kind === 'plate' || near.kind === 'serve' ? 458 : 100, 104, near.kind === 'plate' || near.kind === 'serve' ? 66 : 104, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function nearestStationOf(state) {
    let best = null;
    let bestDist = 78;
    for (const station of STATIONS) {
      const dist = Math.abs(state.chef.x - station.x);
      if (dist <= bestDist) {
        bestDist = dist;
        best = station;
      }
    }
    return best;
  }

  function drawOrderBoard(state, now) {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = PALETTE.boardEdge;
    ctx.fillRect(0, 92, W, 4);
    for (let i = 0; i < MAX_ORDERS; i += 1) {
      const order = state.orders[i];
      const x = 16 + i * 308;
      if (order) drawTicket(ctx, order, x, 10, 292, 76, now);
      else {
        ctx.fillStyle = 'rgba(255,248,231,0.12)';
        rr(ctx, x, 10, 292, 76, 8);
        ctx.fill();
        text(ctx, 'waiting for the next order…', x + 146, 52, 13, 'rgba(255,248,231,0.55)', 600, 'center');
      }
    }
    // Timer, hearts, coins and score on the right.
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    const timerText = `${mins}:${String(secs).padStart(2, '0')}`;
    const timerColor = state.timeLeft > 60 ? '#fff3dd' : state.timeLeft > 30 ? '#f2c94c' : '#ff8a7a';
    clockIcon(ctx, 992, 46, 15);
    text(ctx, timerText, 1014, 52, 26, timerColor, 800);
    for (let i = 0; i < 3; i += 1) heart(ctx, 1108 + i * 30, 46, 26, i < state.hearts);
    coinIcon(ctx, 1212, 30, 11);
    text(ctx, String(state.coins), 1272, 34, 16, '#fff3dd', 700, 'right');
    text(ctx, `SCORE ${state.score}`, 1272, 62, 14, '#d9c48f', 700, 'right');
    text(ctx, `served ${state.served}`, 1272, 80, 11, '#d9c48f', 600, 'right');
  }

  function drawToast(state) {
    if (state.messageT <= 0 || !state.message) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.messageT);
    ctx.font = `700 15px ${FONT}`;
    const w = ctx.measureText(state.message).width + 36;
    ctx.fillStyle = 'rgba(43,29,18,0.88)';
    rr(ctx, (W - w) / 2, 286, w, 34, 17);
    ctx.fill();
    text(ctx, state.message, W / 2, 309, 15, '#fff3dd', 700, 'center');
    ctx.restore();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(20,12,6,0.62)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'COPPER LADLE KITCHEN', W / 2, 250, 56, '#fff3dd', 800, 'center');
    text(ctx, 'A rush-hour cooking game — grab, chop, cook, plate, serve.', W / 2, 292, 20, '#f2c94c', 600, 'center');
    text(ctx, 'Move with ← → or the mouse · 1–6 grab · Space works the station under you', W / 2, 340, 17, '#fff3dd', 600, 'center');
    text(ctx, 'Enter serves a finished plate · X clears hand + plate · P pauses', W / 2, 368, 17, '#fff3dd', 600, 'center');
    text(ctx, 'Serve every order before its patience runs out. 3 walkouts end the shift.', W / 2, 396, 17, '#fff3dd', 600, 'center');
    text(ctx, 'Press Space or click to start', W / 2, 452, 22, '#f2c94c', 800, 'center');
    if (best > 0) text(ctx, `Best score: ${best}`, W / 2, 492, 16, '#d9c48f', 600, 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20,12,6,0.6)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', W / 2, 330, 48, '#fff3dd', 800, 'center');
    text(ctx, 'Press P or Space to keep cooking', W / 2, 372, 18, '#f2c94c', 600, 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(20,12,6,0.68)';
    ctx.fillRect(0, 0, W, H);
    const stars = state.served >= 9 ? 3 : state.served >= 6 ? 2 : state.served >= 3 ? 1 : 0;
    text(ctx, state.overReason || 'Shift complete!', W / 2, 210, 40, '#fff3dd', 800, 'center');
    for (let i = 0; i < 3; i += 1) star(ctx, W / 2 - 90 + i * 90, 290, 34, i < stars);
    text(ctx, `Dishes served: ${state.served}`, W / 2, 360, 22, '#fff3dd', 700, 'center');
    text(ctx, `Coins earned: ${state.coins}`, W / 2, 394, 22, '#fff3dd', 700, 'center');
    text(ctx, `Score: ${state.score}`, W / 2, 428, 22, '#f2c94c', 800, 'center');
    text(ctx, `Best score: ${Math.max(best, state.score)}`, W / 2, 462, 16, '#d9c48f', 600, 'center');
    text(ctx, 'Press R to cook another shift', W / 2, 512, 18, '#fff3dd', 600, 'center');
  }

  function draw(state, screen, best) {
    fit();
    ctx.clearRect(0, 0, W, H);
    const now = performance.now() / 1000;
    drawKitchen(state, now);
    drawOrderBoard(state, now);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawToast(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw, drawIngredient };
}
