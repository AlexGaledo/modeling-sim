# CLAUDE.md

Operational guidance for Claude Code working in this repository.
**The full project spec, math, and design decisions live in `simulation.md`. Read it first; this file does not restate it.**

---

## What this project is

A Next.js 3D web app simulating a Starbucks café queue, comparing
single-channel (M/M/1) vs multi-channel (M/M/c) service. See `simulation.md`
for the concept, formulas, and roadmap.

---

## Critical invariants — do NOT "fix" these

- **Single-channel is intentionally unstable at the default load.** At ~100
  orders/hr with 5 min/drink service, one barista yields utilization ρ ≈ 8.3,
  so the single-channel queue grows without bound. **This is the point of the
  project, not a bug.** Do not clamp, cap, or "stabilize" the queue to make
  numbers look reasonable. Report instability honestly (flag ρ ≥ 1 as
  unstable); never hide it.
- **`lib/sim/` is pure TypeScript.** Zero imports from React, Three.js, or
  react-three-fiber. It must run and be unit-tested headlessly (Node, no DOM).
  Rendering consumes the sim; the sim never depends on rendering.
- **The simulation is seeded and deterministic.** A given seed must reproduce
  a run exactly. Single-vs-multi comparisons must run on the *same* seeded
  arrival stream to be fair. Don't introduce `Math.random()` anywhere in
  `lib/sim/`.

---

## Validation gate (definition of done for sim work)

No simulation feature is complete until its sampled output is checked against
the closed-form formulas in `simulation.md` §2.2:

- M/M/1: Wq = ρ/(μ−λ), W = 1/(μ−λ)
- M/M/c: Erlang-C P_wait, then Wq = P_wait/(cμ−λ)

Simulated means (over enough replications, with warm-up discarded) must
converge to the theoretical values within a small tolerance. Add/keep a test
that asserts this.

---

## Architecture rules

- Build order follows `simulation.md` §6: **sim core + tests first**, then
  economics, then the Next.js shell, then 3D, then controls, then compare view.
  Do not build UI on top of an unvalidated sim core.
- Shared state (slider params ↔ sim ↔ scene) goes through the Zustand store in
  `lib/store.ts`. Components do not pass sim params around via prop drilling.
- Keep the directory structure in `simulation.md` §5. If a new module is
  needed, place it consistently and note it.

## Stack constraints

- **Next.js** App Router (not Pages Router).
- **TypeScript** in `strict` mode. No `any` to escape type errors — model the
  types properly.
- **3D:** `react-three-fiber` + `@react-three/drei` only. No raw Three.js
  scene management in components. Use instanced meshes for the customer crowd.
- **Styling:** Tailwind CSS for all UI/control-panel styling.
- **State:** Zustand. **Charts:** Recharts (or confirm before swapping).
- No external/branded 3D assets or IP — humanoids are primitive low-poly only.

---

## Commands

```bash
npm run dev         # local dev server (http://localhost:3000)
npm run build       # production build
npm run start       # run production build
npm test            # vitest run — sim core unit tests (must pass before sim work is "done")
npm run test:watch  # vitest in watch mode
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

Run a single test file: `npx vitest run lib/sim/__tests__/engine.mmc.test.ts`

---

## Working style in this repo

- Run `npm test` and `npm run lint` after changes to `lib/sim/` or before
  declaring a task done.
- Prefer small, verifiable steps; validate the sim numerically before moving on.
- If a change appears to require violating an invariant above, stop and surface
  the conflict instead of working around it.