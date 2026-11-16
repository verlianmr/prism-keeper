// Entry point: wires input to the world, runs the frame loop, and renders fixed scenes for screenshots.

import { COLOURS, TUNING, SHOT_MODE, SHOT_SEED } from './config.js';
import { makeRandom } from './random.js';
import { createInput } from './input.js';
import { createWorld, startGame, setColour, togglePause, fire, burst, update } from './world.js';
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
// shows one part of the loop clearly: title, live play with a full HUD, and a results screen.
function buildShotScene(mode) {
  const r = makeRandom(SHOT_SEED * 7919);
  startGame(world);
  world.time = 6.4;

  if (mode === 'play') {
    world.wave = 4;
    world.score = 12840;
    world.combo = 5;
    world.comboClock = 2.2;
    world.kills = 37;
    world.shield = 2;
    world.burstClock = 0;
    world.colour = 0;
    world.aim = -0.42;
    world.shards = [];
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
    for (const it of layout) {
      world.shards.push({
        x: CX + Math.cos(it.a) * it.d,
        y: CY + Math.sin(it.a) * it.d,
        vx: -Math.cos(it.a) * 40, vy: -Math.sin(it.a) * 40,
        colour: it.c, r: it.s, spin: r() * 6, spinV: 0.5, hp: 1,
      });
    }
    world.shots = [
      { x: CX + Math.cos(-0.42) * 210, y: CY + Math.sin(-0.42) * 210,
        vx: 0, vy: 0, colour: 0, life: 1,
        trail: [
          { x: CX + Math.cos(-0.42) * 90, y: CY + Math.sin(-0.42) * 90 },
          { x: CX + Math.cos(-0.42) * 140, y: CY + Math.sin(-0.42) * 140 },
          { x: CX + Math.cos(-0.42) * 180, y: CY + Math.sin(-0.42) * 180 },
          { x: CX + Math.cos(-0.42) * 210, y: CY + Math.sin(-0.42) * 210 },
        ] },
    ];
    for (let i = 0; i < 22; i++) {
      world.particles.push({
        x: CX + Math.cos(-1.05) * 250 + (r() - 0.5) * 60,
        y: CY + Math.sin(-1.05) * 250 + (r() - 0.5) * 60,
        vx: (r() - 0.5) * 120, vy: (r() - 0.5) * 120,
        life: 0.3 + r() * 0.5, colour: COLOURS[2].hex,
      });
    }
    world.messages = [];
  } else if (mode === 'end') {
    world.phase = 'over';
    world.wave = 9;
    world.score = 42680;
    world.best = 42680;
    world.kills = 118;
    world.shield = 0;
    world.colour = 1;
    world.shards = [];
    world.shots = [];
    world.particles = [];
    world.messages = [];
    world.time = 186.2;
  } else {
    world.phase = 'title';
    world.time = 2.1;
    world.messages = [];
    world.shards = [];
    world.shots = [];
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
