# simulation.md

> **Project:** Café Throughput Simulator — Single vs Multi Channel
> **Type:** Modeling & Simulation course project
> **Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · react-three-fiber + drei
> **Status:** In development

**The math lives in `formula-revised.md`.** This file is project prose only — concept, goals, file layout, build order. Do not duplicate formulas here.

---

## 1. Concept & Objective

An interactive 3D web simulation that compares two operating structures for a café:

- **Single channel:** one shared queue, `c` pooled baristas.
- **Multi channel:** three isolated queues (walk-in / pickup / delivery), `b` baristas per channel.

The model is **deterministic** (no randomness, no queueing theory): one person → one drink → `s` minutes → exits. See `formula-revised.md` §0 for the goal and hypothesis, and §10 for the worked example using defaults.

### The central insight

When demand is balanced across channels, single and multi tie. When demand is imbalanced (e.g. walk-in spikes, pickup/delivery flat), single beats multi because pooled baristas absorb the unevenness while multi-channel baristas sit idle on their own empty channel. The simulator lets users explore which `(p, w, s, mix)` conditions make switching single → multi pay off.

---

## 2. Inputs and outputs

See `formula-revised.md`:
- §1 — sliders, constants, customer-type split
- §2 — throughput per barista
- §3 — single-channel drinks served
- §4 — multi-channel drinks served + idle minutes
- §5 — comparison
- §6 — economics (revenue, labor, profit, break-even)
- §7 — hypothesis math (ΔProfit, required p)
- §8 — simulation outputs (KPIs + chart)
- §10 — worked example with defaults

---

## 3. Architecture rules

- **`lib/sim/` is pure TypeScript.** Zero imports from React, Three.js, or react-three-fiber. Headlessly testable in Node.
- **Same inputs → same outputs.** The model is deterministic by construction (no PRNG anywhere).
- Rendering consumes the sim; the sim never depends on rendering.
- Shared state goes through Zustand (`lib/store.ts`). No prop drilling of sim params.

---

## 4. Validation gate

The deterministic engine must reproduce `formula-revised.md` §10 exactly:
- Single (c=3, s=5, defaults) → 36 drinks, $126 revenue, $54 labor, $72 profit, 16 break-even.
- Multi (b=1 per channel, s=5, defaults) → 12+12+12 = 36 drinks, idle minutes 0/0/0.

`lib/sim/__tests__/engine.deterministic.test.ts` pins this. Run before declaring sim work done.

---

## 5. Directory structure

```
app/
  layout.tsx
  page.tsx                 // SceneClient + AppShell
components/
  AppShell.tsx
  SceneClient.tsx
  scene/                   // r3f scene
    Scene.tsx
    Ground.tsx
    QueueLane.tsx
    BaristaStation.tsx
    Customer.tsx
    DrinkTickets.tsx
    Labels.tsx
  controls/
    ControlPanel.tsx
    Slider.tsx
  panels/
    MetricsPanel.tsx
    ComparePanel.tsx
lib/
  store.ts                 // Zustand store + selectSimParams
  hooks/
    useSim.ts
    useSimClock.ts
  sim/
    engine.ts              // deterministic runSimulation
    economics.ts           // revenue/labor/profit/break-even
    types.ts               // SimParams, SimStats, Customer, etc.
    __tests__/
      engine.deterministic.test.ts
      economics.test.ts
formula-revised.md         // canonical math
simulation.md              // this file
CLAUDE.md                  // operational guidance
```

---

## 6. Build order

1. **Sim core + tests** — `lib/sim/types.ts`, `engine.ts`, `economics.ts`, validated against `formula-revised.md` §10.
2. **Store + hook** — `lib/store.ts`, `lib/hooks/useSim.ts`.
3. **Metrics + compare panels** — `MetricsPanel.tsx`, `ComparePanel.tsx`.
4. **3D scene + animation** — `Scene.tsx` and children.
5. **Controls** — `ControlPanel.tsx` sliders for all spec inputs.
6. **Polish** — labels, ground textures, drink tickets, exit animation.

Do not build UI on top of an unvalidated sim core.

---

## 7. Stack constraints

- Next.js App Router (not Pages Router).
- TypeScript `strict` mode. No `any`.
- 3D: `react-three-fiber` + `@react-three/drei` only. Instanced meshes for the crowd.
- Tailwind for UI. Zustand for state. Recharts for graphs.
- No branded 3D assets; low-poly primitives only.
