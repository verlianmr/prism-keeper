// The game state machine: waves, spawning, collisions, score, shield and game-over.

import { TUNING, COLOURS } from './config.js';
import { rand } from './random.js';
import { makeShard, makeProjectile, makeParticle, stepEntity } from './entities.js';
import { sound } from './audio.js';

export function createWorld() {
  return {
    phase: 'title',            // title | play | paused | over | win
    time: 0,
    wave: 1,
    waveClock: 0,
    spawnClock: 0,
    score: 0,
    combo: 1,
    comboClock: 0,
    shield: TUNING.shieldMax,
    colour: 0,
    fireClock: 0,
    burstClock: 0,
    shards: [],
    shots: [],
    particles: [],
    messages: [],
    aim: 0,
    shake: 0,
    flash: 0,
    flashColour: 0,
    kills: 0,
    best: Number(localStorage.getItem('prism-best') || 0),
  };
}

function message(w, text, colour) {
  w.messages.push({ text, colour, life: 1.4, y: 0 });
}

export function startGame(w) {
  w.phase = 'play';
  w.time = 0; w.wave = 1; w.waveClock = 0; w.spawnClock = 0;
  w.score = 0; w.combo = 1; w.comboClock = 0;
  w.shield = TUNING.shieldMax; w.colour = 0;
  w.shards = []; w.shots = []; w.particles = []; w.messages = [];
  w.burstClock = 0; w.kills = 0; w.shake = 0; w.flash = 0;
  sound.start();
  message(w, 'WAVE 1', COLOURS[0].hex);
}

export function setColour(w, i) {
  w.colour = i;
  sound.fire(COLOURS[i].hex === '#38e8ff' ? 420 : i === 1 ? 520 : 640);
}

export function togglePause(w) {
  if (w.phase === 'play') w.phase = 'paused';
  else if (w.phase === 'paused') w.phase = 'play';
}

export function fire(w, cx, cy, aim) {
  if (w.fireClock > 0 || w.phase !== 'play') return;
  w.fireClock = TUNING.fireCooldown;
  const c = COLOURS[w.colour];
  const muzzle = TUNING.coreRadius + 8;
  const x = cx + Math.cos(aim) * muzzle;
  const y = cy + Math.sin(aim) * muzzle;
  const vx = Math.cos(aim) * TUNING.projectileSpeed;
  const vy = Math.sin(aim) * TUNING.projectileSpeed;
  w.shots.push(makeProjectile(x, y, vx, vy, w.colour));
  sound.fire(w.colour === 0 ? 660 : w.colour === 1 ? 520 : 440);
}

export function burst(w, cx, cy) {
  if (w.phase !== 'play' || w.burstClock > 0) return;
  w.burstClock = TUNING.burstCooldown;
  const R = TUNING.burstRadius;
  let hit = 0;
  for (const s of w.shards) {
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d <= R) { s.dead = true; hit++; for (let i = 0; i < 9; i++) w.particles.push(makeParticle(s.x, s.y, COLOURS[s.colour].hex)); }
  }
  w.score += hit * 25 * w.combo;
  w.kills += hit;
  w.flash = 0.35; w.flashColour = w.colour; w.shake = 14;
  sound.burst();
  if (hit) message(w, `BURST +${hit}`, COLOURS[w.colour].hex);
}

function nextWave(w) {
  w.wave++;
  w.waveClock = 0;
  w.spawnClock = 0.8;
  sound.wave();
  message(w, `WAVE ${w.wave}`, COLOURS[w.wave % 3].hex);
}

export function update(w, dt, cx, cy, aim, wantFire) {
  w.time += dt;
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 40);
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt);
  if (w.fireClock > 0) w.fireClock -= dt;
  if (w.burstClock > 0) w.burstClock -= dt;
  w.aim = aim;

  for (const m of w.messages) { m.life -= dt; m.y += dt * 24; }
  w.messages = w.messages.filter(m => m.life > 0);

  for (const p of w.particles) stepEntity(p, dt);
  w.particles = w.particles.filter(p => p.life > 0);

  if (w.phase !== 'play') return;

  w.waveClock += dt;
  if (w.waveClock >= TUNING.waveTime) nextWave(w);

  if (w.comboClock > 0) {
    w.comboClock -= dt;
    if (w.comboClock <= 0) w.combo = 1;
  }

  w.spawnClock -= dt;
  if (w.spawnClock <= 0) {
    const rate = Math.max(TUNING.spawnMin, TUNING.spawnBase - w.wave * TUNING.spawnPerWave);
    w.spawnClock = rate * (0.7 + rand() * 0.6);
    w.shards.push(makeShard(w.wave));
    if (w.wave >= 4 && rand() < 0.28) w.shards.push(makeShard(w.wave));
  }

  if (wantFire) fire(w, cx, cy, aim);

  for (const s of w.shots) {
    stepEntity(s, dt);
    if (Math.hypot(s.x - cx, s.y - cy) > 900) s.life = 0;
  }
  w.shots = w.shots.filter(s => s.life > 0);

  for (const s of w.shards) {
    stepEntity(s, dt);
    for (const shot of w.shots) {
      if (shot.life <= 0) continue;
      if (Math.hypot(shot.x - s.x, shot.y - s.y) < s.r + 7) {
        shot.life = 0;
        if (shot.colour === s.colour) {
          s.hp--;
          w.flash = 0.16; w.flashColour = shot.colour;
          for (let i = 0; i < 8; i++) w.particles.push(makeParticle(s.x, s.y, COLOURS[s.colour].hex, 160));
          sound.match();
          if (s.hp <= 0) {
            s.dead = true; w.kills++;
            w.combo = Math.min(9, w.combo + 1); w.comboClock = TUNING.comboWindow;
            w.score += 100 * w.combo + w.wave * 10;
          }
        } else {
          w.combo = 1; w.comboClock = 0;
          for (let i = 0; i < 5; i++) w.particles.push(makeParticle(s.x, s.y, '#ff4d6d', 90));
          sound.mismatch();
          message(w, 'WRONG COLOUR', '#ff4d6d');
        }
        break;
      }
    }
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d < TUNING.coreRadius + s.r * 0.5) {
      s.dead = true;
      w.shield--;
      w.combo = 1; w.comboClock = 0;
      w.shake = 18; w.flash = 0.3; w.flashColour = 2;
      for (let i = 0; i < 16; i++) w.particles.push(makeParticle(s.x, s.y, '#ff4d6d', 200));
      sound.hit();
      message(w, 'CORE HIT', '#ff4d6d');
      if (w.shield <= 0) {
        w.phase = 'over';
        sound.over();
        if (w.score > w.best) { w.best = w.score; localStorage.setItem('prism-best', String(w.score)); }
      }
    }
  }
  w.shards = w.shards.filter(s => !s.dead);

  if (w.wave > 10 && w.shards.length === 0 && w.waveClock > 4) {
    w.phase = 'win';
    if (w.score > w.best) { w.best = w.score; localStorage.setItem('prism-best', String(w.score)); }
  }
}
