# CLAUDE.md

Operational guidance for Claude Code working in this repository.

**The canonical math lives in `formula-revised.md`. Read it first.** `simulation.md` covers project goals, directory layout, and build order in prose; it does not restate the math.

---

## What this project is

A Next.js 3D web app comparing single-channel (pooled queue) vs multi-channel (per-type queues) café service. The model is **deterministic**: one person → one drink → exactly `s` minutes → person exits. No queueing theory, no PRNG, no probability distributions.

---

## Critical invariants — do NOT "fix" these

- **The model is deterministic.** Same inputs always yield the same output. **Do not introduce `Math.random()`, PRNG, exponential service times, or Poisson arrivals anywhere in `lib/sim/`.** This was previously an M/M/c stochastic sim; we deliberately replaced it with the arithmetic model in `formula-revised.md`.
- **`lib/sim/` is pure TypeScript.** Zero imports from React, Three.js, or react-three-fiber. Headlessly testable in Node. Rendering consumes the sim; the sim never depends on rendering.
- **One person = one drink = `s` minutes.** No multi-drink orders. No per-type service-time multipliers. No randomness in service duration.
- **`formula-revised.md` is the spec.** When a slider range, formula, or default conflicts with code, the formula wins.

---

## Validation gate (definition of done for sim work)

No simulation feature is complete until it reproduces `formula-revised.md` §10 worked example exactly:

- Single (c=3, s=5, defaults) → 36 drinks, $126 rev, $54 labor, **$72 profit**, **16 break-even drinks**.
- Multi (b=1 per channel, s=5, defaults) → 12+12+12 = 36 drinks, idle minutes 0/0/0.

`lib/sim/__tests__/engine.deterministic.test.ts` already pins this. Keep it green.

Idle-minute formula from §4: `idle[ch] = max(0, (b · drinksPerBarista − customers[ch]) · s)`.

---

## Architecture rules

- Build order follows `simulation.md` §6: **sim core + tests first**, then store/hook, then panels, then 3D, then controls. Do not build UI on top of an unvalidated sim core.
- Shared state (slider params ↔ sim ↔ scene) goes through the Zustand store in `lib/store.ts`. Components do not pass sim params around via prop drilling.
- Keep the directory structure in `simulation.md` §5.

## Stack constraints

- **Next.js** App Router (not Pages Router).
- **TypeScript** in `strict` mode. No `any` to escape type errors.
- **3D:** `react-three-fiber` + `@react-three/drei` only. Use instanced meshes for the crowd.
- **Styling:** Tailwind CSS for all UI.
- **State:** Zustand. **Charts:** Recharts (confirm before swapping).
- No external/branded 3D assets — humanoids are primitive low-poly only.

---

## Commands

```bash
npm run dev         # local dev server (http://localhost:3000)
npm run build       # production build
npm run start       # run production build
npm test            # vitest run — sim core unit tests
npm run test:watch  # vitest in watch mode
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

Run a single test file: `npx vitest run lib/sim/__tests__/engine.deterministic.test.ts`

---

## Working style in this repo

- Run `npm test`, `npm run typecheck`, and `npm run lint` after changes to `lib/sim/` or before declaring a task done.
- Prefer small, verifiable steps. Validate the sim numerically against `formula-revised.md` worked examples before moving on.
- If a change appears to require violating an invariant above, stop and surface the conflict instead of working around it.
