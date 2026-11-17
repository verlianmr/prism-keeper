// All drawing: background, core, shards, prism power-ups, projectiles, particles, the upgraded HUD
// (combo meter, shield pips, wave, score, surge) and the title / pause / end screens.

import { PALETTE, COLOURS, TUNING } from './config.js';

function glow(ctx, colour, blur, fn) {
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two #rrggbb colours; used to warm the combo meter as the multiplier climbs. */
function mixHex(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  const to = (x, y) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${to(r1, r2)}${to(g1, g2)}${to(b1, b2)}`;
}

function roundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arc(x + w - rad, y + rad, rad, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arc(x + w - rad, y + h - rad, rad, 0, Math.PI / 2);
  ctx.lineTo(x + rad, y + h);
  ctx.arc(x + rad, y + h - rad, rad, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + rad);
  ctx.arc(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5);
  ctx.closePath();
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
  const pips = TUNING.shieldMax;
  const alive = Math.max(0, Math.min(pips, world.shield ?? 0));

  // shield ring: one arc per remaining pip, brighter when the shield is full
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < pips; i++) {
    const a0 = -Math.PI / 2 + i * (Math.PI * 2 / pips) + 0.08;
    const a1 = -Math.PI / 2 + (i + 1) * (Math.PI * 2 / pips) - 0.08;
    ctx.strokeStyle = i < alive ? 'rgba(125,230,255,0.78)' : 'rgba(90,100,130,0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, R + 22, a0, a1); ctx.stroke();
  }
  if (alive > 0) {
    // a slow pulse around the shield so it reads as armour, not decoration
    const pulse = 0.16 + 0.08 * Math.sin(t * 2.4);
    ctx.strokeStyle = `rgba(125,230,255,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R + 30 + Math.sin(t * 2.4) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  const c = COLOURS[world.colour] ?? COLOURS[0];
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

  // aim line, tinted by the surge so the player feels the boost
  const aimHex = (world.surge ?? 0) > 0 ? PALETTE.surge : c.hex;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(world.aim ?? 0);
  const grad = ctx.createLinearGradient(R, 0, R + 220, 0);
  grad.addColorStop(0, aimHex + 'aa');
  grad.addColorStop(1, aimHex + '00');
  ctx.strokeStyle = grad; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(R + 6, 0); ctx.lineTo(R + 220, 0); ctx.stroke();
  ctx.restore();
}

function drawShard(ctx, s, t) {
  if (s.prism) {
    drawPrismShard(ctx, s, t);
    return;
  }
  const c = COLOURS[s.colour] ?? COLOURS[0];
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

/** The power-up shard: a warm diamond with a pulsing halo and the colour it answers to inside. */
function drawPrismShard(ctx, s, t) {
  const c = COLOURS[s.colour] ?? COLOURS[0];
  const halo = 0.5 + 0.5 * Math.sin(t * 4 + (s.pulse ?? 0));

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.strokeStyle = `rgba(255,233,168,${0.10 + halo * 0.22})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, s.r + 10 + halo * 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  glow(ctx, PALETTE.prism, 26, () => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.spin * 0.6);
    ctx.fillStyle = 'rgba(30,24,10,0.9)';
    ctx.strokeStyle = PALETTE.prism;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const x = Math.cos(a) * s.r, y = Math.sin(a) * s.r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // the colour it answers to, as an inner triangle
    ctx.rotate(-s.spin * 0.9);
    ctx.fillStyle = c.hex;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i / 3 * Math.PI * 2;
      const x = Math.cos(a) * s.r * 0.46, y = Math.sin(a) * s.r * 0.46;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // shield glyph: a small plus
    ctx.strokeStyle = PALETTE.prism;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -s.r - 7); ctx.lineTo(0, -s.r - 15);
    ctx.moveTo(-4, -s.r - 11); ctx.lineTo(4, -s.r - 11);
    ctx.stroke();
    ctx.restore();
  });
}

function drawShots(ctx, world) {
  for (const p of world.shots) {
    const c = COLOURS[p.colour] ?? COLOURS[0];
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
    const frac = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
    ctx.globalAlpha = frac;
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (p.size ?? 2.5) * (0.35 + 0.65 * frac), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The combo block: multiplier, a window bar that drains, and the chain length. */
function drawComboMeter(ctx, world, x, y, width) {
  const mult = world.multiplier ?? 1;
  const chain = world.chain ?? 0;
  const window = TUNING.comboWindow;
  const left = Math.max(0, Math.min(window, world.comboClock ?? 0)) / window;
  const heat = (mult - 1) / Math.max(0.001, TUNING.comboMax - 1);
  const tint = mixHex(COLOURS[world.colour]?.hex ?? PALETTE.ink, PALETTE.gold, heat);
  const active = mult > 1.001;

  // label + chain
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('COMBO', x, y - 12);
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = active ? tint : 'rgba(120,140,180,0.55)';
  ctx.fillText(`CHAIN ${chain}`, x + 74, y - 12);

  // multiplier, with a small pop on every match
  const pop = 1 + (world.comboPulse ?? 0) * 0.14;
  ctx.save();
  ctx.translate(x, y + 14);
  ctx.scale(pop, pop);
  glow(ctx, active ? tint : PALETTE.muted, active ? 18 : 0, () => {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillStyle = active ? tint : 'rgba(150,165,200,0.7)';
    ctx.fillText(`x${mult.toFixed(mult % 1 === 0 ? 0 : 1)}`, 0, 0);
  });
  ctx.restore();

  // window bar
  const barX = x + 74;
  const barW = width - 74;
  const barY = y + 8;
  ctx.fillStyle = 'rgba(90,105,150,0.16)';
  roundedRect(ctx, barX, barY, barW, 7, 3.5);
  ctx.fill();
  if (left > 0) {
    ctx.save();
    ctx.shadowColor = tint;
    ctx.shadowBlur = 10;
    ctx.fillStyle = tint;
    roundedRect(ctx, barX, barY, Math.max(2, barW * left), 7, 3.5);
    ctx.fill();
    ctx.restore();
  }
  // cap ticks: where the multiplier stops mattering
  ctx.strokeStyle = 'rgba(200,215,255,0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const tx = barX + (barW * i) / 3;
    ctx.beginPath(); ctx.moveTo(tx, barY - 2); ctx.lineTo(tx, barY + 9); ctx.stroke();
  }
}

/** Shield pips: filled diamonds for armour in hand, hollow ones for armour spent. */
function drawShieldPips(ctx, world, x, y, size = 8) {
  const max = TUNING.shieldMax;
  const have = Math.max(0, Math.min(max, world.shield ?? 0));
  for (let i = 0; i < max; i++) {
    const px = x + i * (size * 2 + 8);
    const filled = i < have;
    ctx.save();
    ctx.translate(px, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = filled ? PALETTE.shield : 'rgba(120,140,180,0.12)';
    ctx.strokeStyle = filled ? '#cdf6ff' : 'rgba(120,140,180,0.4)';
    ctx.lineWidth = 1.5;
    if (filled) { ctx.shadowColor = PALETTE.shield; ctx.shadowBlur = 12; }
    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawHud(ctx, w, h, world) {
  const barH = 78;
  ctx.fillStyle = 'rgba(8,10,26,0.76)';
  ctx.fillRect(0, 0, w, barH);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(56,232,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,95,210,0.45)');
  grad.addColorStop(1, 'rgba(157,255,95,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, barH - 2, w, 2);

  ctx.textBaseline = 'alphabetic';

  // identity + best
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.fillText('PRISM KEEPER', 24, 32);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText(`BEST ${String(world.best ?? 0).padStart(6, '0')}`, 24, 54);

  // score
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText('SCORE', 252, 28);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText(String(world.score ?? 0).padStart(6, '0'), 252, 60);

  // wave
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText('WAVE', 410, 28);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  const waveText = String(world.wave ?? 1);
  ctx.fillText(waveText, 410, 60);
  const waveW = ctx.measureText(waveText).width;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText(`/ ${TUNING.wavesToWin}`, 410 + waveW + 6, 60);

  // combo meter
  drawComboMeter(ctx, world, 520, 46, 208);

  // shield pips
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText('SHIELD', 744, 28);
  drawShieldPips(ctx, world, 752, 50, 8);

  // surge badge (only while the prism surge runs)
  if ((world.surge ?? 0) > 0) {
    const bx = 852, by = 26, bw = 118, bh = 30;
    const pulse = 0.55 + 0.45 * Math.sin(world.time * 6);
    ctx.fillStyle = `rgba(255,179,71,${0.14 + pulse * 0.10})`;
    roundedRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,179,71,${0.45 + pulse * 0.35})`;
    ctx.lineWidth = 1.5;
    roundedRect(ctx, bx, by, bw, bh, 8);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.surge;
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillText(`SURGE ×${TUNING.prismSurgeMult}`, bx + bw / 2, by + 15);
    ctx.font = '10px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,220,170,0.85)';
    ctx.fillText(`${(world.surge ?? 0).toFixed(1)}s`, bx + bw / 2, by + 26);
  }

  // colour selector
  ctx.textAlign = 'center';
  for (let i = 0; i < COLOURS.length; i++) {
    const c = COLOURS[i];
    const x = w - 28 - (2 - i) * 74;
    const active = i === (world.colour ?? 0);
    ctx.fillStyle = active ? c.hex : c.dim;
    roundedRect(ctx, x - 22, 20, 46, 32, 6);
    ctx.fill();
    ctx.strokeStyle = c.hex;
    ctx.lineWidth = active ? 3 : 1;
    roundedRect(ctx, x - 22, 20, 46, 32, 6);
    ctx.stroke();
    ctx.fillStyle = active ? '#05060f' : PALETTE.muted;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x, 37);
    ctx.textBaseline = 'alphabetic';
  }

  // bottom left: burst charge (the last 60px of the canvas is kept clear for the page's key hint)
  const ready = (world.burstClock ?? 0) <= 0;
  ctx.textAlign = 'left';
  ctx.fillStyle = ready ? COLOURS[world.colour]?.hex ?? PALETTE.ink : PALETTE.muted;
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillText(ready ? 'BURST READY · B' : `BURST ${(world.burstClock ?? 0).toFixed(1)}s`, 24, h - 56);
  ctx.fillStyle = 'rgba(120,140,180,0.2)';
  roundedRect(ctx, 24, h - 48, 180, 6, 3);
  ctx.fill();
  ctx.fillStyle = COLOURS[world.colour]?.hex ?? PALETTE.ink;
  roundedRect(ctx, 24, h - 48, 180 * (1 - Math.max(0, world.burstClock ?? 0) / TUNING.burstCooldown), 6, 3);
  ctx.fill();

  // bottom right: prism cadence
  const every = TUNING.prismEvery;
  const nextIn = Math.max(0, Math.min(every, world.pickupClock ?? 0));
  const charge = 1 - nextIn / every;
  const prismReady = nextIn <= 0.001;
  ctx.textAlign = 'right';
  ctx.fillStyle = prismReady ? PALETTE.prism : 'rgba(255,233,168,0.62)';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillText(prismReady ? 'PRISM INBOUND' : `PRISM ${nextIn.toFixed(1)}s`, w - 24, h - 56);
  ctx.fillStyle = 'rgba(255,233,168,0.18)';
  roundedRect(ctx, w - 204, h - 48, 180, 6, 3);
  ctx.fill();
  ctx.fillStyle = PALETTE.prism;
  roundedRect(ctx, w - 204, h - 48, 180 * charge, 6, 3);
  ctx.fill();

  // bottom centre: the run's small print
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(106,115,146,0.85)';
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText(`BROKEN ${world.kills ?? 0}  ·  PRISMS ${world.prisms ?? 0}  ·  TOP ×${(world.topMultiplier ?? 1).toFixed(1)}`, w / 2, h - 54);
}

function drawMessages(ctx, w, h, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
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
  panel(ctx, w, h, 0.84);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = w / 2;
  const top = h / 2 - 134;

  glow(ctx, '#38e8ff', 30, () => {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 76px "Trebuchet MS", sans-serif';
    ctx.fillText('PRISM KEEPER', cx, top);
  });
  ctx.fillStyle = '#c6d2ff';
  ctx.font = '22px "Trebuchet MS", sans-serif';
  ctx.fillText('Hold the core. Match the colour. Chain the light.', cx, top + 56);

  const rules = [
    'Shards of three colours drift toward the core. Only a beam of the matching colour',
    'breaks them, and every break inside the combo window raises your multiplier — up to ×9.',
    'A wrong hit or a lapsed chain drops it back to ×1.',
    'Match a prism shard for +1 shield and a score surge. A shard that reaches the core costs a shield.',
  ];
  ctx.font = '17px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#aab6d8';
  for (let i = 0; i < rules.length; i++) ctx.fillText(rules[i], cx, top + 114 + i * 26);

  // the three colours, with the prism shard beside them
  const chipY = top + 242;
  for (let i = 0; i < 3; i++) {
    const c = COLOURS[i];
    const x = cx - 150 + i * 96;
    glow(ctx, c.hex, 14, () => {
      ctx.strokeStyle = c.hex; ctx.fillStyle = c.dim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, chipY, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = c.hex;
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.fillText(c.label, x, chipY + 38);
  }
  const px = cx + 150;
  glow(ctx, PALETTE.prism, 18, () => {
    ctx.strokeStyle = PALETTE.prism;
    ctx.fillStyle = 'rgba(30,24,10,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const x = px + Math.cos(a) * 18, yy = chipY + Math.sin(a) * 18;
      i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = PALETTE.prism;
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText('PRISM · +SHIELD', px, chipY + 38);

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText('CLICK OR PRESS SPACE TO BEGIN', cx, top + 334);
  ctx.globalAlpha = 1;

  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('MOUSE aim  ·  CLICK / SPACE fire  ·  1 2 3 colour  ·  B burst  ·  P pause', cx, top + 372);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText('BEST SCORE  ' + (world.best ?? 0), cx, top + 404);
}

function drawEnd(ctx, w, h, world, won) {
  panel(ctx, w, h, 0.82);

  // A results card, so the stats never fight the arena behind them.
  const cardW = 720;
  const cardH = 388;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 - 10;
  ctx.fillStyle = 'rgba(6,8,20,0.92)';
  roundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,120,220,0.28)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const colour = won ? '#9dff5f' : '#ff4d6d';
  glow(ctx, colour, 34, () => {
    ctx.fillStyle = colour;
    ctx.font = 'bold 62px "Trebuchet MS", sans-serif';
    ctx.fillText(won ? 'PRISM HELD' : 'CORE LOST', w / 2, cardY + 82);
  });

  ctx.fillStyle = PALETTE.muted;
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText('FINAL SCORE', w / 2, cardY + 122);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
  ctx.fillText(String(world.score ?? 0), w / 2, cardY + 168);

  ctx.strokeStyle = 'rgba(90,120,220,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 64, cardY + 198);
  ctx.lineTo(cardX + cardW - 64, cardY + 198);
  ctx.stroke();

  const stats = [
    ['WAVES CLEARED', String(Math.max(0, (world.wave ?? 1) - 1))],
    ['SHARDS BROKEN', String(world.kills ?? 0)],
    ['BEST COMBO', `×${(world.topMultiplier ?? 1).toFixed(1)}`],
    ['PRISMS', String(world.prisms ?? 0)],
  ];
  const colW = cardW / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const x = cardX + colW * (i + 0.5);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText(stats[i][1], x, cardY + 244);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '11px "Trebuchet MS", sans-serif';
    ctx.fillText(stats[i][0], x, cardY + 268);
  }

  const fresh = (world.score ?? 0) >= (world.best ?? 0) && (world.score ?? 0) > 0;
  ctx.fillStyle = fresh ? PALETTE.gold : PALETTE.muted;
  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  ctx.fillText(fresh ? `NEW BEST  ${world.best ?? 0}` : `BEST  ${world.best ?? 0}`, w / 2, cardY + 330);

  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.fillText('PRESS SPACE OR CLICK TO PLAY AGAIN', w / 2, cardY + cardH + 54);
  ctx.globalAlpha = 1;
}

function drawPause(ctx, w, h, world) {
  panel(ctx, w, h, 0.7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 60px "Trebuchet MS", sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Press P to resume', w / 2, h / 2 + 40);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText(`MULTIPLIER ×${(world.multiplier ?? 1).toFixed(1)}  ·  SHIELD ${world.shield ?? 0}/${TUNING.shieldMax}`, w / 2, h / 2 + 78);
}

export function render(ctx, w, h, world) {
  const cx = w / 2, cy = h / 2 + 12;
  const t = world.time;

  // The background never shakes: the arena stays put while the action rattles.
  drawBackground(ctx, w, h, t);

  ctx.save();
  if ((world.shake ?? 0) > 0) {
    // Deterministic shake (no Math.random) so ?shot= scenes render the same frame every time.
    const amp = world.shake;
    ctx.translate(Math.sin(t * 71) * amp * 0.45, Math.cos(t * 63) * amp * 0.32);
  }
  drawShots(ctx, world);
  for (const s of world.shards) drawShard(ctx, s, t);
  drawParticles(ctx, world);
  drawCore(ctx, cx, cy, world, t);
  ctx.restore();

  // The screen effects sit above the arena but below the HUD, so a hit never costs the player
  // their score line: the flash is feedback, not an obstacle.

  // red vignette on a wrong-colour hit (and on a core hit, which sets the same flag)
  if ((world.missFlash ?? 0) > 0) {
    const a = Math.min(0.5, world.missFlash * 0.5);
    const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.22, cx, cy, Math.max(w, h) * 0.62);
    g.addColorStop(0, 'rgba(255,77,109,0)');
    g.addColorStop(1, `rgba(255,77,109,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(255,77,109,${Math.min(0.85, world.missFlash * 0.7)})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  }

  if ((world.flash ?? 0) > 0) {
    const hex = world.flashHex ?? COLOURS[world.flashColour]?.hex ?? PALETTE.ink;
    ctx.fillStyle = hex;
    ctx.globalAlpha = Math.min(0.18, world.flash * 0.5);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  if (world.phase === 'play' || world.phase === 'paused') drawHud(ctx, w, h, world);
  drawMessages(ctx, w, h, world);

  if (world.phase === 'title') drawTitle(ctx, w, h, world, t);
  else if (world.phase === 'paused') drawPause(ctx, w, h, world);
  else if (world.phase === 'over') drawEnd(ctx, w, h, world, false);
  else if (world.phase === 'win') drawEnd(ctx, w, h, world, true);
}
