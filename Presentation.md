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

## 2-Minute Presentation Script

**(0:00)** "Imagine you run a café with three order streams flowing in — people walking in off the street, mobile pickup orders, and delivery drivers. You have to decide: do you put everyone in one line and let any free barista take the next customer? Or do you split into three dedicated lines, each with its own barista?"

**(0:20)** "That's the question this simulator answers. And the answer isn't obvious — it depends on your specific demand mix, your service time, your labor cost, and your profit margin per drink."

**(0:30)** "Let me show you how the model works. It's deliberately simple: one person orders one drink, it takes exactly `s` minutes to make, they leave. No randomness, no queueing theory, no probability distributions. Same inputs always give the same outputs. This means we can reason about the results with pure arithmetic."

**(0:50)** [Point to the 3D scene or metrics panel] "Here are the defaults: 100 customers per hour — 50 walk-in, 25 pickup, 25 delivery. Five-minute service time. Three baristas total. With a single queue, all three baristas work as a pool — any free hand takes the next person. With per-type queues, one barista handles walk-in, one handles pickup, one handles delivery — and they never cross over."

**(1:10)** "At these defaults, both systems serve 36 drinks and earn $72 profit per hour. They tie. That's because every channel has more demand than a single barista can handle, so nobody sits idle."

**(1:20)** [Adjust walk-in slider up or service time slider] "But watch what happens when demand gets imbalanced. Say walk-in spikes. The single queue handles it — all three baristas just work through the line together. The per-type system? The delivery barista finishes their orders in 12 minutes and then sits idle for the remaining 48 minutes, watching the walk-in line grow. They can't help — they're assigned to delivery only."

**(1:40)** [Switch to compare mode] "This is where the compare mode comes in. It sweeps total customer volume from zero up past capacity and plots profit for both systems. You can see the exact crossover point — the customer count where the recommendation flips. The Decision Guide below tells you, at your current settings, which system earns more and by how much."

**(1:55)** "So the core insight: single queue wins on flexibility — no barista ever sits idle while customers wait. Per-type queues win on operational simplicity — clear ownership, no cross-training needed. The simulator doesn't tell you which is universally better. It tells you which one actually makes more money, for your specific numbers."
