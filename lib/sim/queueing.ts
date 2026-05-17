export interface QueueingMetrics {
  rho: number;
  /** mean waiting time in queue (same time unit as λ⁻¹) */
  Wq: number;
  /** mean time in system */
  W: number;
  /** mean number in queue (Little's law: Lq = λ·Wq) */
  Lq: number;
  unstable: boolean;
}

/** Closed-form M/M/1. Returns unstable=true when ρ ≥ 1 (formulas don't apply). */
export function mm1(lambda: number, mu: number): QueueingMetrics {
  const rho = lambda / mu;
  if (rho >= 1) {
    return { rho, Wq: Infinity, W: Infinity, Lq: Infinity, unstable: true };
  }
  const Wq = rho / (mu - lambda);
  const W = 1 / (mu - lambda);
  const Lq = lambda * Wq;
  return { rho, Wq, W, Lq, unstable: false };
}

/** Closed-form M/M/c via Erlang-C. Returns unstable=true when ρ ≥ 1. */
export function mmc(lambda: number, mu: number, c: number): QueueingMetrics {
  if (c < 1 || !Number.isInteger(c)) {
    throw new Error(`mmc: c must be a positive integer (got ${c})`);
  }
  if (c === 1) return mm1(lambda, mu);

  const a = lambda / mu; // offered load (Erlangs)
  const rho = a / c;
  if (rho >= 1) {
    return { rho, Wq: Infinity, W: Infinity, Lq: Infinity, unstable: true };
  }

  // Sum_{k=0}^{c-1} a^k / k!
  let sum = 0;
  let term = 1; // a^0 / 0!
  for (let k = 0; k < c; k++) {
    if (k > 0) term = (term * a) / k;
    sum += term;
  }
  // a^c / c!
  const acOverCFact = (term * a) / c;
  const Pwait = (acOverCFact / (1 - rho)) / (sum + acOverCFact / (1 - rho));
  const Wq = Pwait / (c * mu - lambda);
  const W = Wq + 1 / mu;
  const Lq = lambda * Wq;
  return { rho, Wq, W, Lq, unstable: false };
}
