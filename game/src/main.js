// Entry point: wires input to the world, runs the frame loop, and renders fixed scenes for screenshots.

import { COLOURS, PALETTE, SHOT_MODE, SHOT_SEED } from './config.js';
import { makeRandom } from './random.js';
import { createInput } from './input.js';
import { createWorld, startGame, setColour, togglePause, burst, update } from './world.js';
import { render } from './render.js';

if (SHOT_MODE) {
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'none';
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const CX = W / 2, CY = H / 2 + 12;

const world = createWorld();

const input = createInput(
  canvas,
  (i) => setColour(world, i),
  () => togglePause(world),
  () => burst(world, CX, CY),
);

function beginFromInput() {
  if (world.phase === 'title' || world.phase === 'over' || world.phase === 'win') startGame(world);
}

canvas.addEventListener('pointerdown', beginFromInput);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && (world.phase === 'title' || world.phase === 'over' || world.phase === 'win')) {
    e.preventDefault();
    startGame(world);
  }
});

// ---- Deterministic screenshot scenes -------------------------------------------------------
// The kit takes screenshots from URLs like ?shot=play&seed=1. Each scene is a fixed frame that
// shows one part of the loop clearly: title, live play with a full HUD (combo meter, shield pips,
// a prism shard and particles), and a results screen.
/** A ring of frozen particles for a screenshot: offset from the impact, moving outward. */
function scatter(list, x, y, count, colour, r) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.5;
    const radius = 16 + r() * 62;
    const speed = 90 + r() * 190;
    list.push({
      x: x + Math.cos(a) * radius,
      y: y + Math.sin(a) * radius,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.6 + r() * 0.4,
      maxLife: 1,
      size: 2.6 + r() * 1.8,
      colour,
    });
  }
}

function shardAt(a, d, colour, r, extra = {}) {  return {
    x: CX + Math.cos(a) * d,
    y: CY + Math.sin(a) * d,
    vx: -Math.cos(a) * 40,
    vy: -Math.sin(a) * 40,
    colour,
    r,
    spin: a * 1.7,
    spinV: 0.5,
    hp: 1,
    prism: false,
    ...extra,
  };
}

function buildShotScene(mode) {
  const r = makeRandom(SHOT_SEED * 7919);
  startGame(world);
  world.time = 6.4;

  if (mode === 'play') {
    world.wave = 4;
    world.score = 12840;
    world.best = 26400;
    world.chain = 9;
    world.multiplier = 5.5;
    world.topMultiplier = 6.5;
    world.comboClock = 2.6;
    world.comboPulse = 0.55;
    world.kills = 37;
    world.misses = 2;
    world.prisms = 3;
    world.shield = 2;
    world.surge = 4.3;
    world.pickupClock = 6.8;
    world.burstClock = 0;
    world.colour = 0;
    world.aim = -0.42;
    world.shake = 0;
    world.flash = 0;
    world.missFlash = 0;

    const layout = [
      { a: -2.55, d: 300, c: 0, s: 20 },
      { a: -1.95, d: 420, c: 1, s: 17 },
      { a: -1.05, d: 250, c: 2, s: 22 },
      { a: -0.35, d: 500, c: 0, s: 18 },
      { a: 0.55,  d: 330, c: 1, s: 19 },
      { a: 1.35,  d: 460, c: 2, s: 21 },
      { a: 2.20,  d: 280, c: 0, s: 16 },
      { a: 3.05,  d: 390, c: 1, s: 18 },
    ];
    world.shards = layout.map((it) => shardAt(it.a, it.d, it.c, it.s, {
      spin: r() * 6,
      hp: it.s > 20 ? 2 : 1,
    }));
    // the power-up shard, mid-flight and unmistakable
    world.shards.push(shardAt(-2.9, 450, 0, 26, {
      prism: true,
      pulse: 1.4,
      spinV: 0.9,
      vx: -Math.cos(-2.9) * 34,
      vy: -Math.sin(-2.9) * 34,
    }));

    world.shots = [
      {
        x: CX + Math.cos(-0.42) * 210,
        y: CY + Math.sin(-0.42) * 210,
        vx: 0, vy: 0, colour: 0, life: 1,
        trail: [90, 140, 180, 210].map((d) => ({
          x: CX + Math.cos(-0.42) * d,
          y: CY + Math.sin(-0.42) * d,
        })),
      },
      {
        x: CX + Math.cos(1.35) * 250,
        y: CY + Math.sin(1.35) * 250,
        vx: 0, vy: 0, colour: 2, life: 1,
        trail: [150, 200, 250].map((d) => ({
          x: CX + Math.cos(1.35) * d,
          y: CY + Math.sin(1.35) * d,
        })),
      },
    ];

    // two fresh impacts: a lime break and a prism payout, spread into visible rings
    world.particles = [];
    scatter(world.particles, CX + Math.cos(-1.05) * 250, CY + Math.sin(-1.05) * 250, 26, COLOURS[2].hex, r);
    scatter(world.particles, CX + Math.cos(-2.9) * 450, CY + Math.sin(-2.9) * 450, 16, PALETTE.prism, r);

    world.messages = [
      { text: 'PRISM · SHIELD +1', colour: PALETTE.prism, life: 1.1, y: 8 },
    ];
  } else if (mode === 'end') {
    world.phase = 'over';
    world.wave = 9;
    world.score = 42680;
    world.best = 42680;
    world.kills = 118;
    world.misses = 14;
    world.prisms = 5;
    world.topMultiplier = 7.5;
    world.multiplier = 1;
    world.chain = 0;
    world.comboClock = 0;
    world.surge = 0;
    world.shield = 0;
    world.colour = 1;
    world.shards = [];
    world.shots = [];
    world.particles = [];
    world.messages = [];
    world.shake = 0;
    world.flash = 0;
    world.missFlash = 0;
    world.time = 186.2;
  } else {
    world.phase = 'title';
    world.best = 38420;
    world.time = 2.1;
    world.messages = [];
    world.shards = [];
    world.shots = [];
    world.particles = [];
    world.shake = 0;
    world.flash = 0;
    world.missFlash = 0;
  }
}

if (SHOT_MODE === 'start' || SHOT_MODE === 'play' || SHOT_MODE === 'end') {
  buildShotScene(SHOT_MODE);
  render(ctx, W, H, world);
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const aim = Math.atan2(input.my - CY, input.mx - CX);
    update(world, dt, CX, CY, aim, input.down || input.space);
    render(ctx, W, H, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
