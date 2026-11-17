// Central tuning and palette for Prism Keeper. One job: the numbers and colours everything else reads.

export const PALETTE = {
  bg: '#05060f',
  bgGlow: '#0b0e22',
  ink: '#e8ecff',
  muted: '#6a7392',
  grid: '#12162e',
  core: '#f4f7ff',
  danger: '#ff4d6d',
  gold: '#ffd166',
  prism: '#ffe9a8',   // the power-up shard: warm white, unlike any of the three play colours
  surge: '#ffb347',   // the temporary score surge badge
  shield: '#7de6ff',  // shield pips on the HUD and the ring around the core
};

// The three prism colours. Each shard carries one; matching colour destroys it.
export const COLOURS = [
  { key: 'cyan',    hex: '#38e8ff', dim: '#0d5a68', label: 'CYAN' },
  { key: 'magenta', hex: '#ff5fd2', dim: '#6a1b57', label: 'MAGENTA' },
  { key: 'lime',    hex: '#9dff5f', dim: '#3a6a1b', label: 'LIME' },
];

export const TUNING = {
  // core and weapons
  coreRadius: 46,
  projectileSpeed: 760,
  fireCooldown: 0.16,
  burstRadius: 340,
  burstCooldown: 12,

  // shards and waves
  shardRadius: 16,
  shardBaseSpeed: 44,
  shardSpeedPerWave: 9,
  spawnBase: 1.15,
  spawnPerWave: 0.09,
  spawnMin: 0.34,
  waveTime: 24,
  startRadius: 620,
  wavesToWin: 10,

  // combo multiplier: every match inside comboWindow grows the chain by one step, capped at comboMax.
  comboWindow: 3.4,
  comboStep: 0.5,
  comboMax: 9,

  // scoring: award() multiplies these by the combo multiplier (and by prismSurgeMult while surging).
  matchScore: 100,
  matchScorePerWave: 10,
  burstScore: 25,
  prismScore: 250,

  // shield power-up: a prism shard arrives on this cadence and pays out when matched.
  shieldMax: 3,
  prismShield: 1,
  prismFirst: 9,
  prismEvery: 13,
  prismRadius: 26,
  prismSpeed: 34,
  prismSpeedPerWave: 2.5,
  prismSurgeTime: 6,
  prismSurgeMult: 1.5,
};

// A deterministic per-shot scene is rendered when ?shot=start|play|end is present.
export const SHOT_MODE = new URLSearchParams(location.search).get('shot');
export const SHOT_SEED = Number(new URLSearchParams(location.search).get('seed') || 1);
