// The game state machine: waves, spawning, collisions, the combo multiplier, prism power-ups,
// score, shield and game-over. Signatures stay stable: main.js and render.js only read the world.

import { TUNING, COLOURS, PALETTE } from './config.js';
import { rand } from './random.js';
import { makeShard, makePrism, makeProjectile, makeBurst, stepEntity } from './entities.js';
import { sound } from './audio.js';

/** The stored best score, or 0 when storage is unavailable (private mode, file://, a locked-down iframe). */
function readBest() {
  try {
    return Number(localStorage.getItem('prism-best') || 0) || 0;
  } catch {
    return 0;
  }
}

export function createWorld() {
  return {
    phase: 'title',            // title | play | paused | over | win
    time: 0,
    wave: 1,
    waveClock: 0,
    spawnClock: 0,
    score: 0,

    // combo multiplier: chain counts matches inside the window, multiplier is what score is multiplied by.
    chain: 0,
    multiplier: 1,
    topMultiplier: 1,
    comboClock: 0,             // seconds left before the chain lapses
    comboPulse: 0,             // 1 → 0, drives the HUD pop on every match

    // shield power-up
    pickupClock: TUNING.prismFirst,  // seconds until the next prism shard drifts in
    prisms: 0,                       // prisms collected this run
    surge: 0,                        // seconds of score surge left

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
    flashColour: 0,            // index into COLOURS, kept for callers that think in indices
    flashHex: null,            // exact overlay colour when the flash is not one of the three
    missFlash: 0,              // 1 → 0, the red vignette on a wrong-colour hit
    kills: 0,
    misses: 0,
    best: readBest(),
  };
}

function message(w, text, colour) {
  w.messages.push({ text, colour, life: 1.5, y: 0 });
}

/** The multiplier a chain of `n` matches is worth: 1 + n * step, capped at comboMax. */
function multiplierFor(chain) {
  const raw = 1 + chain * TUNING.comboStep;
  return Math.round(Math.min(TUNING.comboMax, raw) * 100) / 100;
}

/** Drop the chain back to nothing. Returns whether a real multiplier was lost. */
function resetCombo(w, announce) {
  const lost = w.multiplier > 1.001;
  w.chain = 0;
  w.multiplier = 1;
  w.comboClock = 0;
  w.comboPulse = 0;
  if (announce && lost) message(w, 'COMBO LOST', PALETTE.danger);
  return lost;
}

/** Score a base amount through the multiplier and any active surge. */
function award(w, base) {
  const surge = w.surge > 0 ? TUNING.prismSurgeMult : 1;
  const gain = Math.round(base * w.multiplier * surge);
  w.score += gain;
  return gain;
}

function recordBest(w) {
  if (w.score > w.best) {
    w.best = w.score;
    try { localStorage.setItem('prism-best', String(w.score)); } catch { /* private mode: the run still counts */ }
  }
}

export function startGame(w) {
  w.phase = 'play';
  w.time = 0; w.wave = 1; w.waveClock = 0; w.spawnClock = 0;
  w.score = 0;
  w.chain = 0; w.multiplier = 1; w.topMultiplier = 1; w.comboClock = 0; w.comboPulse = 0;
  w.shield = TUNING.shieldMax; w.colour = 0;
  w.pickupClock = TUNING.prismFirst; w.prisms = 0; w.surge = 0;
  w.shards = []; w.shots = []; w.particles = []; w.messages = [];
  w.burstClock = 0; w.kills = 0; w.misses = 0;
  w.shake = 0; w.flash = 0; w.flashHex = null; w.missFlash = 0;
  sound.start();
  message(w, 'WAVE 1', COLOURS[0].hex);
}

export function setColour(w, i) {
  w.colour = i;
  sound.fire(420 + i * 110);
}

export function togglePause(w) {
  if (w.phase === 'play') w.phase = 'paused';
  else if (w.phase === 'paused') w.phase = 'play';
}

export function fire(w, cx, cy, aim) {
  if (w.fireClock > 0 || w.phase !== 'play') return;
  w.fireClock = TUNING.fireCooldown;
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
    if (s.prism) continue;  // the burst clears hazards; a power-up is only ever collected by a match
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d <= R) {
      s.dead = true;
      hit++;
      w.particles.push(...makeBurst(s.x, s.y, s.prism ? PALETTE.prism : COLOURS[s.colour].hex, 9, 190, { life: 0.7 }));
    }
  }
  if (hit) {
    award(w, hit * TUNING.burstScore);
    w.kills += hit;
  }
  w.flash = 0.35; w.flashColour = w.colour; w.flashHex = COLOURS[w.colour].hex;
  w.shake = 14;
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

/** A matching beam finished a shard off: grow the chain, then pay out. */
function onMatch(w, s) {
  w.chain++;
  w.comboClock = TUNING.comboWindow;
  w.multiplier = multiplierFor(w.chain);
  if (w.multiplier > w.topMultiplier) w.topMultiplier = w.multiplier;
  w.comboPulse = 1;

  if (s.prism) {
    const had = w.shield;
    w.shield = Math.min(TUNING.shieldMax, w.shield + TUNING.prismShield);
    w.surge = Math.max(w.surge, TUNING.prismSurgeTime);
    w.prisms++;
    w.flash = 0.4; w.flashColour = s.colour; w.flashHex = PALETTE.prism;
    w.particles.push(...makeBurst(s.x, s.y, PALETTE.prism, 26, 260, { life: 0.9, size: 3.2 }));
    w.particles.push(...makeBurst(s.x, s.y, COLOURS[s.colour].hex, 14, 150, { life: 0.7, ring: true }));
    sound.match();
    sound.wave();
    message(w, w.shield > had ? 'PRISM · SHIELD +1' : 'PRISM · SURGE UP', PALETTE.prism);
    award(w, TUNING.prismScore);
    return;
  }

  w.kills++;
  w.flash = 0.18; w.flashColour = s.colour; w.flashHex = COLOURS[s.colour].hex;
  w.particles.push(...makeBurst(s.x, s.y, COLOURS[s.colour].hex, 12, 180, { life: 0.6 }));
  sound.match();
  award(w, TUNING.matchScore + w.wave * TUNING.matchScorePerWave);
}

/** A beam of the wrong colour landed: the chain dies and the screen says so. */
function onMiss(w, s) {
  w.misses++;
  resetCombo(w, false);
  w.missFlash = 1;
  w.shake = Math.max(w.shake, 11);
  w.particles.push(...makeBurst(s.x, s.y, PALETTE.danger, 10, 130, { life: 0.55 }));
  sound.mismatch();
  message(w, 'WRONG COLOUR', PALETTE.danger);
}

function spawnPrism(w) {
  // One power-up on the field at a time: a second would only crowd the read.
  if (w.shards.some((s) => s.prism)) return;
  w.shards.push(makePrism(w.wave));
  message(w, 'PRISM INBOUND', PALETTE.prism);
}

export function update(w, dt, cx, cy, aim, wantFire) {
  w.time += dt;
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 40);
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt);
  if (w.missFlash > 0) w.missFlash = Math.max(0, w.missFlash - dt * 2.4);
  if (w.comboPulse > 0) w.comboPulse = Math.max(0, w.comboPulse - dt * 3.4);
  if (w.fireClock > 0) w.fireClock -= dt;
  if (w.burstClock > 0) w.burstClock -= dt;
  w.aim = aim;

  for (const m of w.messages) { m.life -= dt; m.y += dt * 24; }
  w.messages = w.messages.filter((m) => m.life > 0);

  for (const p of w.particles) stepEntity(p, dt);
  w.particles = w.particles.filter((p) => p.life > 0);

  if (w.phase !== 'play') return;

  w.waveClock += dt;
  if (w.waveClock >= TUNING.waveTime) nextWave(w);

  // combo window: let it lapse, and say so when a real multiplier falls away.
  if (w.comboClock > 0) {
    w.comboClock -= dt;
    if (w.comboClock <= 0) resetCombo(w, true);
  }

  // score surge from a prism decays on its own clock.
  if (w.surge > 0) w.surge = Math.max(0, w.surge - dt);

  // prism power-up cadence.
  w.pickupClock -= dt;
  if (w.pickupClock <= 0) {
    w.pickupClock = TUNING.prismEvery;
    spawnPrism(w);
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
  w.shots = w.shots.filter((s) => s.life > 0);

  for (const s of w.shards) {
    stepEntity(s, dt);

    for (const shot of w.shots) {
      if (shot.life <= 0) continue;
      if (Math.hypot(shot.x - s.x, shot.y - s.y) < s.r + 7) {
        shot.life = 0;
        if (shot.colour === s.colour) {
          s.hp--;
          if (s.hp > 0) {
            // A two-hit shard survives: the chain holds its window open but does not advance.
            w.comboClock = TUNING.comboWindow;
            w.flash = 0.16; w.flashColour = shot.colour; w.flashHex = COLOURS[shot.colour].hex;
            w.particles.push(...makeBurst(s.x, s.y, COLOURS[s.colour].hex, 8, 150, { life: 0.5 }));
            sound.match();
          } else {
            s.dead = true;
            onMatch(w, s);
          }
        } else {
          onMiss(w, s);
        }
        break;
      }
    }

    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d < TUNING.coreRadius + s.r * 0.5) {
      s.dead = true;
      if (s.prism) {
        // A missed power-up is a lost bonus, not a lost shield: forgiving by design.
        w.particles.push(...makeBurst(s.x, s.y, PALETTE.prism, 10, 120, { life: 0.5 }));
        message(w, 'PRISM LOST', PALETTE.muted);
        continue;
      }
      w.shield = Math.max(0, w.shield - 1);
      resetCombo(w, false);
      w.shake = Math.max(w.shake, 18);
      w.flash = 0.32; w.flashColour = s.colour; w.flashHex = PALETTE.danger;
      w.missFlash = 1;
      w.particles.push(...makeBurst(s.x, s.y, PALETTE.danger, 18, 230, { life: 0.8 }));
      sound.hit();
      message(w, 'CORE HIT', PALETTE.danger);
      if (w.shield <= 0) {
        w.phase = 'over';
        sound.over();
        recordBest(w);
      }
    }
  }
  w.shards = w.shards.filter((s) => !s.dead);

  if (w.wave > TUNING.wavesToWin && !w.shards.some((s) => !s.prism) && w.waveClock > 4) {
    w.phase = 'win';
    recordBest(w);
  }
}
