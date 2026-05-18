# Modelsim.md — Café Throughput Simulator

Project summary. Single source of truth for math: `formula-revised.md`. Operational rules: `CLAUDE.md`. Prose + layout: `simulation.md`.

---

## 1. What it is

Next.js 3D web app that compares two service structures for a café over one hour:

- **Single channel:** one shared queue, `c` pooled baristas serve any order type.
- **Multi channel:** three isolated queues (walk-in / pickup / delivery), `b` baristas dedicated per channel.

The model is **deterministic arithmetic**: 1 person → 1 drink → exactly `s` minutes → exits. Same inputs always give the same output. No PRNG, no queueing theory, no probability distributions.

This is a deliberate redesign from an earlier stochastic M/M/c version. The earlier engine, PRNG, Erlang-C formulas, and warm-up logic were removed.

---

## 2. Goal & hypothesis

**Goal:** Quantify how many drinks each system completes in one hour and whether switching single → multi earns more profit.

**Hypothesis:** Under what drinks/hour and profit/drink does the switch pay off?

**Key insight the sim demonstrates:** When demand is balanced across channels, single and multi tie. When demand is imbalanced (e.g. walk-in spike, pickup/delivery flat), single beats multi — pooled baristas absorb unevenness while channel-locked baristas sit idle.

---

## 3. Math (full text in `formula-revised.md`)

| Quantity | Formula |
|---|---|
| Drinks per barista | `floor(H / s)` |
| Single drinks served | `min(N, c · drinksPerBarista)` |
| Multi drinks served (per channel) | `min(customers[ch], b · drinksPerBarista)` |
| Idle barista-min (multi, per channel) | `max(0, (b · drinksPerBarista − customers[ch]) · s)` |
| Revenue per hour | `drinksServed · p` |
| Labor per hour | `totalBaristas · w` |
| Profit per hour | `revenue − labor` |
| Break-even drinks | `ceil(totalBaristas · w / p)` |
| ΔProfit (multi − single) | `profit_multi − profit_single` |
| Required p for ΔProfit = 0 | `(baristas_multi − baristas_single) · w / (drinks_multi − drinks_single)` |

Defaults (`formula-revised.md` §1, §10): `s = 5`, `w = $18`, `p = $3.50`, `H = 60`, `N = 100` (50 walk-in / 25 pickup / 25 delivery). Worked example: single (c=3) = 36 drinks, $72 profit, 16 break-even; multi (b=1 per channel) = 12+12+12 = 36 drinks, idle 0/0/0.

---

## 4. Stack

- **Framework:** Next.js App Router, TypeScript `strict`.
- **3D:** `react-three-fiber` + `@react-three/drei`. Instanced meshes for the crowd.
- **State:** Zustand.
- **Charts:** Recharts.
- **Styling:** Tailwind CSS.
- **Tests:** Vitest.

---

## 5. Directory layout

```
app/
  layout.tsx, page.tsx
components/
  AppShell.tsx, SceneClient.tsx
  scene/        Scene, Ground, QueueLane, BaristaStation, Customer, DrinkTickets, Labels
  controls/     ControlPanel, Slider
  panels/       MetricsPanel, ComparePanel
lib/
  store.ts                       Zustand store, slider state, selectSimParams
  hooks/
    useSim.ts                    Wraps runSimulation; returns SingleRunResult | MultiRunResult
    useSimClock.ts               Animation clock tied to simSpeed
  sim/                           PURE TS — no React, no Three.js
    types.ts                     SimParams, SimStats, Customer, OrderType, PerTypeCount, SimMode
    engine.ts                    runSimulation(params): RunResult — deterministic
    economics.ts                 revenuePerHour, laborCostPerHour, profitPerHour,
                                 breakEvenDrinks, economicsFromStats, compareScenarios
    __tests__/
      engine.deterministic.test.ts   Pins §10 worked example + §4 idle math + determinism
      economics.test.ts              Pins revenue/labor/profit/break-even/compare
formula-revised.md     CANONICAL math
simulation.md          Project prose + dir layout + build order
CLAUDE.md              Operational rules (invariants, validation gate, commands)
Modelsim.md            This summary
```

---

## 6. Key types

```ts
// lib/sim/types.ts
type OrderType = "walkin" | "pickup" | "delivery";
type SimMode = "single" | "multi";

interface PerTypeCount { walkin: number; pickup: number; delivery: number }

interface Customer {
  id: number;
  orderType: OrderType;
  arrivalTime: number;          // for 3D animation; evenly spaced over horizon
  serviceStartTime?: number;    // undefined if never served within H
  departureTime?: number;       // = serviceStartTime + s when served
}

interface SimParams {
  serviceTimeMinutes: number;
  baristas: number;             // c (single mode)
  baristasPerChannel: number;   // b (multi mode)
  customersByType: PerTypeCount;
  horizonMinutes: number;       // default 60
  mode: SimMode;
}

interface SimStats {
  drinksServed: number;
  drinksServedByType: PerTypeCount;
  customersUnserved: number;
  customersUnservedByType: PerTypeCount;
  drinksPerBarista: number;
  idleBaristaMinutesByChannel?: PerTypeCount;  // multi only
  totalBaristas: number;
  horizonMinutes: number;
}
```

---

## 7. Engine behavior

**Single channel.** Customer queue is built by interleaving the three types proportionally (largest-remainder rule) so the 3D crowd reads as mixed, not blocked by type. Customer `i` is served by barista `i mod c`, starts at `floor(i/c)·s`, departs at `start + s`. If `start + s > H`, customer is unserved.

**Multi channel.** Per type, customer `i` of that type is served by barista `i mod b`, starts at `floor(i/b)·s`, departs at `start + s`. Same cutoff. Idle barista-minutes per channel from §4 formula.

**Determinism.** No PRNG anywhere in `lib/sim/`. Same `SimParams` → identical `RunResult`, asserted by test.

---

## 8. UI

- **ControlPanel.** Sliders for mode (single/multi/compare), walk-in/pickup/delivery counts, baristas (c or b), service time, sim speed (animation only), hourly wage [$10–$20], profit per drink [$1–$5].
- **MetricsPanel.** Banner with served/total + percentage. KPI grid: drinks served, unserved, drinks/barista, idle barista-minutes (multi). Per-channel cards in multi mode. Economics block: revenue, labor, profit, break-even drinks.
- **ComparePanel.** Three charts using the current slider state as a baseline:
  1. Cumulative drinks completed over the hour — step function, single vs multi (§8 chart).
  2. Drinks served vs walk-in count sweep — single vs multi.
  3. ΔProfit vs walk-in count sweep.
- **3D scene.** Color-coded humanoid customers (walk-in red / pickup yellow / delivery blue) advance through the queue, reach a barista station for `s` minutes, drinks appear on the rail as tickets, customer exits.

---

## 9. Critical invariants

Code is wired to enforce these — do not "fix" them:

1. **`lib/sim/` is pure TS.** Zero React/Three.js imports. Headlessly testable.
2. **No randomness anywhere in `lib/sim/`.** Deterministic by construction.
3. **One person = one drink = `s` minutes.** No multi-drink orders. No per-type service multipliers. No random service draw.
4. **`formula-revised.md` is the spec.** When slider/formula/default conflicts with code, the formula wins.

---

## 10. Validation gate

The deterministic engine must reproduce `formula-revised.md` §10 exactly:

- Single (c=3, s=5, defaults) → 36 drinks, $126 revenue, $54 labor, $72 profit, 16 break-even.
- Multi (b=1 per channel, s=5, defaults) → 12+12+12 = 36 drinks, idle 0/0/0.
- Imbalanced (walkin=50, pickup=5, delivery=5, b=1, s=5) → multi 22 drinks, idle 0/35/35.

Pinned by `lib/sim/__tests__/engine.deterministic.test.ts`. Run before declaring sim work done.

---

## 11. Commands

```bash
npm run dev         # localhost:3000
npm run build       # production build
npm run start       # serve production build
npm test            # vitest run
npm run test:watch  # vitest watch
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

Single test file: `npx vitest run lib/sim/__tests__/engine.deterministic.test.ts`.

---

## 12. Build order

If rebuilding from scratch, follow `simulation.md` §6:

1. Sim core + tests (`types.ts`, `engine.ts`, `economics.ts`) — validate against §10.
2. Store + hook (`lib/store.ts`, `lib/hooks/useSim.ts`).
3. Metrics + compare panels.
4. 3D scene + animation.
5. Controls.
6. Polish (labels, textures, drink tickets, exit animation).

Do not build UI on top of an unvalidated sim core.
