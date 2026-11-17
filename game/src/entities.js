// Entity factories and physics for shards, prism power-ups, projectiles and particles.
// Every factory returns a plain object the world can step and the renderer can draw; nothing here
// knows about score, phases or the HUD.

import { TUNING, COLOURS } from './config.js';
import { rand } from './random.js';

/** A hazard shard: drifts inward from the rim, carries one prism colour, dies to a matching beam. */
export function makeShard(wave, forced) {
  const ang = rand() * Math.PI * 2;
  const dist = TUNING.startRadius;
  const colour = forced ?? Math.floor(rand() * COLOURS.length);
  const speed = TUNING.shardBaseSpeed + wave * TUNING.shardSpeedPerWave + rand() * 16;
  return {
    x: Math.cos(ang) * dist,
    y: Math.sin(ang) * dist,
    vx: -Math.cos(ang) * speed,
    vy: -Math.sin(ang) * speed,
    colour,
    r: TUNING.shardRadius + rand() * 6,
    spin: rand() * Math.PI * 2,
    spinV: (rand() - 0.5) * 2.4,
    hp: wave > 6 && rand() < 0.25 ? 2 : 1,
    prism: false,
    seen: false,
  };
}

/**
 * The prism power-up shard. It is a shard like any other (same colour rule, same collision code) but
 * it drifts in slowly, is drawn in warm white, and pays out a shield and a score surge when matched.
 */
export function makePrism(wave, forced) {
  const ang = rand() * Math.PI * 2;
  const dist = TUNING.startRadius * 0.9;
  const colour = forced ?? Math.floor(rand() * COLOURS.length);
  const speed = TUNING.prismSpeed + wave * TUNING.prismSpeedPerWave;
  return {
    x: Math.cos(ang) * dist,
    y: Math.sin(ang) * dist,
    vx: -Math.cos(ang) * speed,
    vy: -Math.sin(ang) * speed,
    colour,
    r: TUNING.prismRadius,
    spin: rand() * Math.PI * 2,
    spinV: 0.9,
    hp: 1,
    prism: true,
    seen: false,
    pulse: rand() * Math.PI * 2,
  };
}

export function makeProjectile(x, y, vx, vy, colour) {
  return { x, y, vx, vy, colour, life: 1.6, trail: [] };
}

/** One particle. `opts` carries size, life, drag and spread so bursts can be tuned per event. */
export function makeParticle(x, y, colour, speed = 120, opts = {}) {
  const a = rand() * Math.PI * 2;
  const s = speed * (0.4 + rand()) * (opts.spread ?? 1);
  const life = (opts.life ?? 0.6) * (0.7 + rand() * 0.6);
  return {
    x,
    y,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s,
    life,
    maxLife: life,
    colour,
    size: opts.size ?? 2.5,
    drag: opts.drag ?? 2.0,
  };
}

/**
 * A whole particle burst as a plain array, ready to spread into world.particles. Used on every match,
 * every miss and every core hit, so the game always answers an event with light.
 */
export function makeBurst(x, y, colour, count = 10, speed = 160, opts = {}) {
  const n = Math.max(1, Math.round(count));
  const out = [];
  for (let i = 0; i < n; i++) {
    if (opts.ring) {
      // Ring bursts read as an impact; jitter keeps them from looking mechanical.
      const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      const s = speed * (0.7 + rand() * 0.5);
      const life = (opts.life ?? 0.6) * (0.75 + rand() * 0.5);
      out.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        colour,
        size: opts.size ?? 2.6,
        drag: opts.drag ?? 2.4,
      });
    } else {
      out.push(makeParticle(x, y, colour, speed, opts));
    }
  }
  return out;
}

export function stepEntity(entity, dt) {
  if (entity.drag) {
    const k = Math.max(0, 1 - entity.drag * dt);
    entity.vx *= k;
    entity.vy *= k;
  }
  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;
  if (entity.spin !== undefined) entity.spin += (entity.spinV || 0) * dt;
  if (entity.pulse !== undefined) entity.pulse += dt * 3.2;
  if (entity.life !== undefined) entity.life -= dt;
  if (entity.trail) {
    entity.trail.push({ x: entity.x, y: entity.y });
    if (entity.trail.length > 8) entity.trail.shift();
  }
}
