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
};

// The three prism colours. Each shard carries one; matching colour destroys it.
export const COLOURS = [
  { key: 'cyan',    hex: '#38e8ff', dim: '#0d5a68', label: 'CYAN' },
  { key: 'magenta', hex: '#ff5fd2', dim: '#6a1b57', label: 'MAGENTA' },
  { key: 'lime',    hex: '#9dff5f', dim: '#3a6a1b', label: 'LIME' },
];

export const TUNING = {
  coreRadius: 46,
  projectileSpeed: 760,
  fireCooldown: 0.16,
  shardRadius: 16,
  shardBaseSpeed: 44,
  shardSpeedPerWave: 9,
  spawnBase: 1.15,
  spawnPerWave: 0.09,
  spawnMin: 0.34,
  burstRadius: 340,
  burstCooldown: 12,
  shieldMax: 3,
  comboWindow: 3.2,
  waveTime: 24,
  startRadius: 620,
};

// A deterministic per-shot scene is rendered when ?shot=start|play|end is present.
export const SHOT_MODE = new URLSearchParams(location.search).get('shot');
export const SHOT_SEED = Number(new URLSearchParams(location.search).get('seed') || 1);
