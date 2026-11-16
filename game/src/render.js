// All drawing: background, core, shards, projectiles, HUD and the title / pause / end screens.

import { PALETTE, COLOURS, TUNING } from './config.js';

function glow(ctx, colour, blur, fn) {
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

function drawBackground(ctx, w, h, t) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, PALETTE.bgGlow);
  g.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  const step = 64;
  const drift = (t * 8) % step;
  for (let x = -step + drift; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = -step + drift; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // slowly rotating rings behind the core
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(t * 0.05);
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = `rgba(80,100,190,${0.10 - i * 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 170 + i * 90, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawCore(ctx, cx, cy, world, t) {
  const R = TUNING.coreRadius;
  // shield ring
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < TUNING.shieldMax; i++) {
    const a0 = -Math.PI / 2 + i * (Math.PI * 2 / TUNING.shieldMax) + 0.08;
    const a1 = -Math.PI / 2 + (i + 1) * (Math.PI * 2 / TUNING.shieldMax) - 0.08;
    ctx.strokeStyle = i < world.shield ? 'rgba(120,230,255,0.75)' : 'rgba(90,100,130,0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, R + 22, a0, a1); ctx.stroke();
  }
  ctx.restore();

  const c = COLOURS[world.colour];
  glow(ctx, c.hex, 28, () => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.9);
    ctx.fillStyle = 'rgba(8,12,30,0.92)';
    ctx.strokeStyle = c.hex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const x = Math.cos(a) * R, y = Math.sin(a) * R;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // inner triangular prism mark
    ctx.rotate(-t * 1.8);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i / 3 * Math.PI * 2;
      const x = Math.cos(a) * R * 0.5, y = Math.sin(a) * R * 0.5;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.strokeStyle = PALETTE.core; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  });

  // aim line
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(world.aim);
  const grad = ctx.createLinearGradient(R, 0, R + 220, 0);
  grad.addColorStop(0, c.hex + 'aa'); grad.addColorStop(1, c.hex + '00');
  ctx.strokeStyle = grad; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(R + 6, 0); ctx.lineTo(R + 220, 0); ctx.stroke();
  ctx.restore();
}

function drawShard(ctx, s, t) {
  const c = COLOURS[s.colour];
  glow(ctx, c.hex, 18, () => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.spin);
    ctx.strokeStyle = c.hex;
    ctx.fillStyle = c.dim;
    ctx.lineWidth = 2.5;
    const sides = s.hp > 1 ? 5 : 3;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = i / sides * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * s.r, y = Math.sin(a) * s.r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (s.hp > 1) { ctx.beginPath(); ctx.arc(0, 0, s.r * 0.35, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  });
}

function drawShots(ctx, world) {
  for (const p of world.shots) {
    const c = COLOURS[p.colour];
    glow(ctx, c.hex, 16, () => {
      ctx.strokeStyle = c.hex; ctx.lineWidth = 4; ctx.lineCap = 'round';
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (const q of p.trail) ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    });
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.colour;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, w, h, world) {
  ctx.fillStyle = 'rgba(8,10,26,0.72)';
  ctx.fillRect(0, 0, w, 66);
  ctx.strokeStyle = 'rgba(90,120,220,0.25)';
  ctx.beginPath(); ctx.moveTo(0, 66); ctx.lineTo(w, 66); ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText('PRISM KEEPER', 24, 33);

  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('SCORE', 300, 24);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
  ctx.fillText(String(world.score).padStart(6, '0'), 300, 46);

  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('WAVE', 540, 24);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
  ctx.fillText(String(world.wave), 540, 46);

  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('COMBO', 690, 24);
  ctx.fillStyle = world.combo > 1 ? COLOURS[world.colour].hex : PALETTE.ink;
  ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
  ctx.fillText('x' + world.combo, 690, 46);

  // shield pips
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.muted; ctx.textAlign = 'left';
  ctx.fillText('SHIELD', 860, 24);
  for (let i = 0; i < TUNING.shieldMax; i++) {
    ctx.fillStyle = i < world.shield ? '#7de6ff' : 'rgba(120,140,180,0.15)';
    ctx.fillRect(860 + i * 26, 38, 18, 14);
  }

  // colour selector
  ctx.textAlign = 'right';
  for (let i = 0; i < COLOURS.length; i++) {
    const c = COLOURS[i];
    const x = w - 28 - (2 - i) * 74;
    const active = i === world.colour;
    ctx.fillStyle = active ? c.hex : c.dim;
    ctx.fillRect(x - 22, 18, 46, 30);
    ctx.strokeStyle = c.hex; ctx.lineWidth = active ? 3 : 1;
    ctx.strokeRect(x - 22, 18, 46, 30);
    ctx.fillStyle = active ? '#05060f' : PALETTE.muted;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText(String(i + 1), x, 33);
  }

  // burst cooldown
  ctx.textAlign = 'left';
  const ready = world.burstClock <= 0;
  ctx.fillStyle = ready ? COLOURS[world.colour].hex : PALETTE.muted;
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  ctx.fillText(ready ? 'BURST READY (B)' : `BURST ${world.burstClock.toFixed(1)}s`, 24, h - 26);
  ctx.fillStyle = 'rgba(120,140,180,0.2)';
  ctx.fillRect(24, h - 16, 180, 5);
  ctx.fillStyle = COLOURS[world.colour].hex;
  ctx.fillRect(24, h - 16, 180 * (1 - Math.max(0, world.burstClock) / TUNING.burstCooldown), 5);
}

function drawMessages(ctx, w, h, world) {
  ctx.textAlign = 'center';
  for (const m of world.messages) {
    ctx.globalAlpha = Math.max(0, Math.min(1, m.life));
    ctx.fillStyle = m.colour;
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.fillText(m.text, w / 2, h / 2 - 130 - m.y);
  }
  ctx.globalAlpha = 1;
}

function panel(ctx, w, h, alpha = 0.72) {
  ctx.fillStyle = `rgba(5,6,15,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

function drawTitle(ctx, w, h, world, t) {
  panel(ctx, w, h, 0.82);
  ctx.textAlign = 'center';
  glow(ctx, '#38e8ff', 30, () => {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 76px "Trebuchet MS", sans-serif';
    ctx.fillText('PRISM KEEPER', w / 2, h / 2 - 110);
  });
  ctx.fillStyle = '#c6d2ff';
  ctx.font = '22px "Trebuchet MS", sans-serif';
  ctx.fillText('Hold the core. Match the colour. Break the wave.', w / 2, h / 2 - 48);

  const cx = w / 2;
  const y = h / 2 + 10;
  ctx.font = '18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#aab6d8';
  ctx.fillText('Shards of three colours drift toward the core. Only a beam of the', cx, y);
  ctx.fillText('matching colour breaks them. Wrong hits break your combo. Let one', cx, y + 28);
  ctx.fillText('touch the core and a shield falls. Survive ten waves to win.', cx, y + 56);

  for (let i = 0; i < 3; i++) {
    const c = COLOURS[i];
    const x = cx - 120 + i * 120;
    glow(ctx, c.hex, 14, () => {
      ctx.strokeStyle = c.hex; ctx.fillStyle = c.dim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + 108, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = c.hex; ctx.font = '14px "Trebuchet MS", sans-serif';
    ctx.fillText(c.label, x, y + 146);
  }

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText('CLICK OR PRESS SPACE TO BEGIN', cx, h / 2 + 232);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('BEST SCORE  ' + world.best, cx, h / 2 + 272);
}

function drawEnd(ctx, w, h, world, won) {
  panel(ctx, w, h, 0.78);
  ctx.textAlign = 'center';
  const colour = won ? '#9dff5f' : '#ff4d6d';
  glow(ctx, colour, 34, () => {
    ctx.fillStyle = colour;
    ctx.font = 'bold 74px "Trebuchet MS", sans-serif';
    ctx.fillText(won ? 'PRISM HELD' : 'CORE LOST', w / 2, h / 2 - 90);
  });
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '26px "Trebuchet MS", sans-serif';
  ctx.fillText('FINAL SCORE  ' + world.score, w / 2, h / 2 - 20);
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`WAVES CLEARED  ${Math.max(0, world.wave - 1)}     SHARDS BROKEN  ${world.kills}`, w / 2, h / 2 + 24);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('BEST  ' + world.best, w / 2, h / 2 + 58);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.fillText('PRESS SPACE OR CLICK TO PLAY AGAIN', w / 2, h / 2 + 128);
}

function drawPause(ctx, w, h) {
  panel(ctx, w, h, 0.7);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 60px "Trebuchet MS", sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Press P to resume', w / 2, h / 2 + 48);
}

export function render(ctx, w, h, world) {
  const cx = w / 2, cy = h / 2 + 12;
  ctx.save();
  if (world.shake > 0) ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  drawBackground(ctx, w, h, world.time);
  drawShots(ctx, world);
  for (const s of world.shards) drawShard(ctx, s, world.time);
  drawParticles(ctx, world);
  drawCore(ctx, cx, cy, world, world.time);
  ctx.restore();

  if (world.phase === 'play' || world.phase === 'paused') drawHud(ctx, w, h, world);
  drawMessages(ctx, w, h, world);

  if (world.flash > 0) {
    ctx.fillStyle = COLOURS[world.flashColour].hex;
    ctx.globalAlpha = Math.min(0.18, world.flash * 0.5);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  if (world.phase === 'title') drawTitle(ctx, w, h, world, world.time);
  else if (world.phase === 'paused') drawPause(ctx, w, h);
  else if (world.phase === 'over') drawEnd(ctx, w, h, world, false);
  else if (world.phase === 'win') drawEnd(ctx, w, h, world, true);
}
