// Prism Keeper — hand-in program for make.fun's best-game-01 bounty (Node 22, standard library only).
// It packages this directory's game/ (plain static files the browser loads offline) and screenshots/
// into /output, then writes the dossier.json the blind judge reads. The game itself is in game/src/;
// this file only assembles the submission artifact and enforces the scorer's size caps.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The platform caps, mirrored here so a local run fails the same way the grader would.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else { files++; bytes += st.size; }
    }
  };
  walk(dir);
  return { files, bytes };
}

function assemble() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

  // Screenshots are optional for a local smoke run but required for a real entry.
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }

  const stats = countTree(join(out, 'game'));
  if (stats.files > CAPS.game_max_files || stats.bytes > CAPS.game_max_bytes) {
    throw new Error(`game/ exceeds caps: ${stats.files} files, ${stats.bytes} bytes`);
  }

  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`Prism Keeper packaged: ${stats.files} game files, ${stats.bytes} game bytes, dossier ${Buffer.byteLength(dossier)} bytes`);
}

assemble();
