# Café Throughput Simulator — Presentation

## Project

An interactive 3D web app that compares **single-channel** (one shared queue, pooled baristas) vs **multi-channel** (per-type queues, dedicated baristas) café service. Built with Next.js, TypeScript, Three.js (react-three-fiber), Zustand, and Recharts.

---

## The Problem

A café has three order streams — **walk-in**, **pickup**, and **delivery** — each arriving at different volumes. Should you run:

- **Single queue:** one line, any free barista takes the next person
- **Per-type queues:** three separate lines, each with a dedicated barista

The trade-off is structural: a single pool handles uneven demand efficiently but can starve if demand is balanced across types. Dedicated queues eliminate inter-type contention but create idle time when a channel runs dry while others are backed up.

## The Model (Deterministic, §formula-revised.md)

**One person → one drink → exactly `s` minutes → exits.** No randomness, no queueing theory. Same inputs always produce the same outputs.

### Core formula

| Concept | Formula |
|---------|---------|
| Drinks per barista | `floor(H / s)` — e.g. 60 min / 5 min = 12 drinks/hr |
| Single served | `min(N, c × drinksPerBarista)` — pooled capacity |
| Multi served | `sum per channel: min(customers[ch], b × drinksPerBarista)` |
| Idle minutes | `max(0, (b × perBarista − customers[ch]) × s)` |
| Revenue | `drinksServed × profitPerDrink` |
| Labor | `totalBaristas × hourlyWage` |
| Profit | `revenue − labor` |
| Break-even | `ceil(labor / profitPerDrink)` |
| ΔProfit | `profit_multi − profit_single` |

### Default worked example (s=5, $3.50/drink, $18/hr, 3 baristas)

| Metric | Single (c=3) | Multi (b=1 per channel) |
|--------|-------------|------------------------|
| Drinks served | 36 (of 100) | 36 (12+12+12) |
| Revenue | $126 | $126 |
| Labor | $54 | $54 |
| **Profit** | **$72** | **$72** |
| Break-even | 16 drinks | 16 drinks |

At defaults the two tie because every channel has more demand than one barista can handle. They **diverge** when demand is imbalanced or service time changes — that is the core exploration.

---

## Architecture

```
lib/sim/              ← Pure TypeScript, no rendering deps
  types.ts              SimParams, SimStats, Customer
  engine.ts             runSimulation() — deterministic dispatch
  economics.ts          revenue, labor, profit, break-even, comparison
  __tests__/            Pinned against worked example (36 drinks, $72 profit)
lib/store.ts           Zustand store — all slider state
components/
  panels/MetricsPanel.tsx   Single/Multi KPI views
  panels/ComparePanel.tsx   Crossover charts + Decision Guide
  controls/ControlPanel.tsx Sliders (walkin, pickup, delivery, s, c, b, wage, p)
  scene/                    Three.js: QueueLane, Customer, BaristaStation
```

### Key design decisions

- **Sim core is testable headlessly.** No React/Three.js imports in `lib/sim/`.
- **Compare mode** runs both simulations in parallel on every render (via `useMemo`) and shows the crossover on a total-customers sweep.
- **Decision Guide** box tells you which channel type is better at your current volume, and at what customer count the recommendation flips.
- **3D scene** visualizes the queue advancing every `s` minutes, with colored customers per order type and barista stations.

---

## 1-Minute Presentation Script

**(0:00)** "This is a café throughput simulator that answers one question: should your shop run a single shared queue or separate queues for walk-in, pickup, and delivery?"

**(0:15)** "The model is completely deterministic — one person orders one drink, it takes exactly `s` minutes to make, they leave. No randomness, no probability. Same inputs always give the same outputs."

**(0:25)** [Point to the 3D scene or metrics panel] "Here we have the defaults: 100 customers per hour, 5-minute service time, 3 baristas. Both single and multi-channel serve exactly 36 drinks and earn $72 profit per hour — they tie."

**(0:35)** [Adjust walk-in slider up or service time slider] "But watch what happens when we change the demand mix. Single queue absorbs the spike because any free barista takes the next person. Multi-channel? The delivery barista finishes their 25 orders and sits idle while walk-in has a 50-person line."

**(0:45)** [Switch to compare mode] "The compare mode sweeps total customer volume against profit, showing you the exact crossover point — the customer count where you should switch from multi to single queue. The Decision Guide below tells you which system earns more profit right now."

**(0:55)** "So the core insight: single queue wins on flexibility — no barista sits idle while customers wait. Per-type queues win on simplicity — clear ownership, no cross-training. The simulator lets you find, for your specific demand mix, which structure actually makes more money."
