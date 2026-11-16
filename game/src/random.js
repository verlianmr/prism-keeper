// Small seeded RNG so screenshots are reproducible from a URL seed.

export function makeRandom(seed) {
  let s = (seed >>> 0) || 1;
  return function random() {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

export const rand = makeRandom(20261116);
