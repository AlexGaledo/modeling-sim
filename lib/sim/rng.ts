export type Rng = () => number;

/** mulberry32 — small, fast, seedable PRNG. Deterministic for a given seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Exponential(rate) sample via inverse-CDF transform. */
export function sampleExponential(rate: number, rng: Rng): number {
  // Math.log(0) = -Inf; guard the rare u = 0 by drawing 1 − u so the argument > 0.
  const u = 1 - rng();
  return -Math.log(u) / rate;
}

/** Categorical sample. `weights` need not be normalized. Returns the index. */
export function sampleCategorical(weights: readonly number[], rng: Rng): number {
  let total = 0;
  for (const w of weights) total += w;
  const target = rng() * total;
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i] ?? 0;
    if (target < cum) return i;
  }
  return weights.length - 1;
}
