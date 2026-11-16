// Entity factories and physics for shards, projectiles and particles.

import { TUNING, COLOURS } from './config.js';
import { rand } from './random.js';

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
    seen: false,
  };
}

export function makeProjectile(x, y, vx, vy, colour) {
  return { x, y, vx, vy, colour, life: 1.6, trail: [] };
}

export function makeParticle(x, y, colour, speed = 120) {
  const a = rand() * Math.PI * 2;
  const s = speed * (0.4 + rand());
  return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + rand() * 0.5, colour };
}

export function stepEntity(entity, dt) {
  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;
  if (entity.spin !== undefined) entity.spin += (entity.spinV || 0) * dt;
  if (entity.life !== undefined) entity.life -= dt;
  if (entity.trail) {
    entity.trail.push({ x: entity.x, y: entity.y });
    if (entity.trail.length > 8) entity.trail.shift();
  }
}
