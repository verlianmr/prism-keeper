// Prism Keeper — hand-in program for make.fun's best-game-01 bounty (Node 22, standard library only).
//
// It packages this repository's game/ (plain static files a browser loads offline) and screenshots/
// into MAKEFUN_OUTPUT_DIR (default /output), then writes the dossier.json the blind judge reads.
// The game itself lives in game/src/; this file only assembles the submission artifact and enforces
// the scorer's caps. Run it with `node main.ts` — no install, no build, no network.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** Where the entry is written: the platform's /output, or MAKEFUN_OUTPUT_DIR for a local run. */
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

/**
 * The platform caps, mirrored here so a local run fails the same way the grader would.
 * text_max_bytes shapes the dossier's source text; the rest only refuse.
 */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/**
 * The files and bytes under a directory. The platform counts game/ entries (files and directories)
 * against game_max_files but bytes only for files, and buildDossier does the same; this walk mirrors
 * that so the check below fails before a copy that is obviously too large.
 */
function countTree(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const stats = statSync(path);
      if (stats.isDirectory()) stack.push(path);
      else {
        files++;
        bytes += stats.size;
      }
    }
  }
  return { files, bytes };
}

/** How many images screenshots/ holds, for the run's one-line report. */
function countScreenshots(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .length;
}

function assemble(): void {
  const gameSource = join(here, 'game');
  const shotsSource = join(here, 'screenshots');

  // The one file game/ must hold: fail with a readable message rather than a bare ENOENT.
  if (!existsSync(join(gameSource, 'index.html'))) {
    throw new Error(`no game/index.html at ${gameSource}: the entry needs the playable page at game/index.html`);
  }

  mkdirSync(out, { recursive: true });
  cpSync(gameSource, join(out, 'game'), { recursive: true });

  // Screenshots are optional for a local smoke run but required for a real entry; buildDossier
  // refuses an empty screenshots/, so create the directory either way and let it speak.
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(shotsSource)) {
    cpSync(shotsSource, join(out, 'screenshots'), { recursive: true });
  }

  const stats = countTree(join(out, 'game'));
  if (stats.files > CAPS.game_max_files) {
    throw new Error(`game/ exceeds caps: ${stats.files} files, over the ${CAPS.game_max_files} allowed`);
  }
  if (stats.bytes > CAPS.game_max_bytes) {
    throw new Error(`game/ exceeds caps: ${stats.bytes} bytes, over the ${CAPS.game_max_bytes} allowed`);
  }

  // The dossier is the scorer's own file: build it with the vendored library, byte for byte.
  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);

  const shots = countScreenshots(join(out, 'screenshots'));
  console.log(`output: ${out} (${shots} screenshot${shots === 1 ? '' : 's'})`);
  console.log(`Prism Keeper packaged: ${stats.files} game files, ${stats.bytes} game bytes, dossier ${Buffer.byteLength(dossier)} bytes`);
}

assemble();
