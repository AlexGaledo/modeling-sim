# simulation.md

> **Project:** Starbucks Café Queue Simulator — Single-Channel vs Multi-Channel
> **Type:** Modeling & Simulation course project
> **Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · react-three-fiber + drei
> **Status:** In development

---

## 1. Concept & Objective

Build an interactive 3D web simulation of a Starbucks café that models customer
orders flowing through a service system, and **compares two operating
structures**:

- **Single-channel:** one shared queue feeding **1 barista** (M/M/1).
- **Multi-channel:** one shared queue feeding **N baristas in parallel** (M/M/c).

The simulation receives a customer load (orders per hour) split across three
order types — **walk-in, pickup, delivery** — and outputs operational and
financial metrics so the user can answer: *how many baristas does the café need,
and is adding them profitable?*

### The central insight the project demonstrates

At the headline load of **100 orders/hr** with a **5 min** average service time
per drink, a single barista serves only ~12 drinks/hr. The single-channel system
is therefore **massively overloaded** (utilization ρ ≈ 8.3 ≫ 1) and its queue
grows without bound. This is *intentional*: the project shows **why** a café
must run multiple parallel baristas, lets the user solve for the minimum viable
crew, and then weighs added wage cost against added throughput/profit.

---

## 2. Mathematical Model

### 2.1 Notation (Kendall: M/M/1 and M/M/c)

| Symbol | Meaning | Unit |
|---|---|---|
| λ (lambda) | Arrival rate (orders per hour ÷ 60) | orders/min |
| μ (mu) | Service rate per barista = 1 / service_time | drinks/min |
| c | Number of parallel baristas (1 = single-channel) | count |
| ρ (rho) | Utilization = λ / (c · μ) | unitless |
| Wq | Mean waiting time in queue | min |
| W | Mean time in system (Wq + service) | min |
| Lq | Mean number waiting in queue | count |

System is **stable only when ρ < 1**. If ρ ≥ 1, queue → ∞ (report as unstable).

### 2.2 Theoretical formulas (for validation overlay)

**M/M/1:**
- ρ = λ / μ
- Wq = ρ / (μ − λ)
- W  = 1 / (μ − λ)

**M/M/c:** uses Erlang-C. Let a = λ/μ, ρ = a/c.

```
            (a^c / c!) · (1 / (1 − ρ))
P_wait = ----------------------------------------
         Σ_{k=0}^{c−1} (a^k / k!)  +  (a^c / c!)·(1/(1−ρ))

Wq = P_wait / (c·μ − λ)
W  = Wq + 1/μ
```

These closed-form values are computed in-app and drawn as reference lines
against the simulated (sampled) results — a required validation step for an
M&S deliverable.

### 2.3 Order-type segmentation

Arrivals are split by a configurable mix (defaults below). Each type may carry
its own service-time multiplier and profit margin:

| Type | Default share | Service mult. | Profit/drink (default) |
|---|---|---|---|
| Walk-in | 50% | 1.0× | full margin |
| Pickup (mobile order) | 30% | 0.9× (pre-made) | full margin |
| Delivery (UberEats etc.) | 20% | 1.0× | reduced (platform fee) |

### 2.4 Economic model

```
revenue_per_hour   = Σ (drinks_served_by_type · profit_per_drink_by_type)
labor_cost_per_hour = c · barista_hourly_wage
profit_per_hour     = revenue_per_hour − labor_cost_per_hour
```

The comparison view reports `profit_per_hour` and `average_time_per_order`
for single vs multi side by side across a sweep of customer loads.

---

## 3. Simulation Engine

**Approach: Discrete-Event Simulation (DES) core driving a tick-based 3D
animation layer.** DES gives statistically correct results (the M&S
requirement); the animation layer interpolates between events for smooth 3D.

### 3.1 Core loop (DES)

- Event types: `ARRIVAL`, `SERVICE_START`, `SERVICE_END`.
- Future Event List = min-heap ordered by event time.
- **Arrivals:** inter-arrival time ~ Exponential(λ) (Poisson process).
- **Service:** duration ~ Exponential(μ) per drink, scaled by order-type mult.
- Idle barista pulls the head of the single shared FIFO queue.
- Accumulate per-order: arrival time, service start, departure → derive Wq, W.
- **Play button:** run is paused at time 0 until user presses Play. Pressing
  Play runs the full DES to horizon in one shot (not frame-by-frame), then
  the animation layer replays the event timeline at the configured speed.
  Reset returns to time 0.

### 3.2 Statistics collected

Per run: order_count, total_queue_time, mean Wq, mean W, max queue length,
per-barista utilization, drinks served by type, revenue, labor cost, profit.
Support warm-up discard and multiple replications for stable averages.

### 3.3 Determinism

Seeded PRNG (e.g. `mulberry32`) so a given seed reproduces a run — needed for
debugging and for fair single-vs-multi comparison on identical arrival streams.

---

## 4. 3D Visualization

**Library:** `react-three-fiber` + `@react-three/drei` (camera controls, text,
instancing). Best fit for the Next.js + Tailwind stack.

### 4.1 Scene contents

- **Ground / café floor:** a textured plane defining the service area.
- **Humanoid customers:** low-poly capsule+sphere figures (no external IP),
  **color-coded by order type** (walk-in / pickup / delivery).
- **Queue lane:** customers line up along a path toward the counter.
- **Barista stations:** 1 in single mode, N in multi mode; a station "lights
  up" or shows a progress ring while serving.
- **Camera:** orbit controls, sensible default angle, reset button.

### 4.2 Performance

Use instanced meshes for the customer crowd (loads can reach hundreds).
Animation layer interpolates positions between DES event timestamps; sim speed
is a multiplier (e.g. 1×–60×) decoupled from real time.

### 4.3 Controls

| Control | Range | Affects |
|---|---|---|
| Mode switch | Single · Multi · Compare | operating structure |
| Customer load | 10–300 orders/hr | λ |
| Number of baristas (c) | 1–20 | crew size |
| Service time / drink | 2–10 min | μ |
| Sim speed | 1×–60× | animation playback speed |
| **Play / Reset** | toggle | runs DES or returns to time 0 |

Sim starts paused. User sets params, presses **Play**, DES runs to horizon,
and the 3D scene animates through the event timeline. **Reset** stops and
rewinds to time 0 so params can be changed. Hidden defaults: order-type mix
(50/30/20), barista wage ($18/hr), profit per drink ($3.50/$3.50/$2.00),
seed (auto-generated).

---

## 5. Project Infrastructure

```
starbucks-queue-sim/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # main simulator page
│   └── globals.css              # Tailwind entry
├── components/
│   ├── scene/
│   │   ├── Scene.tsx            # r3f <Canvas> root
│   │   ├── Ground.tsx
│   │   ├── Customer.tsx         # instanced humanoids
│   │   ├── BaristaStation.tsx
│   │   └── QueueLane.tsx
│   ├── controls/
│   │   ├── ControlPanel.tsx     # all sliders/toggles
│   │   └── Slider.tsx
│   └── panels/
│       ├── MetricsPanel.tsx     # live KPIs
│       └── ComparePanel.tsx     # single vs multi charts
├── lib/
│   ├── sim/
│   │   ├── engine.ts            # DES core (event heap, loop)
│   │   ├── rng.ts               # seeded PRNG + exponential sampler
│   │   ├── queueing.ts          # M/M/1 & M/M/c closed-form
│   │   ├── economics.ts         # profit/cost model
│   │   └── types.ts
│   └── store.ts                 # state (Zustand) for params <-> scene
├── public/                      # textures
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── package.json
```

### 5.1 Tooling

- **Next.js (App Router) + TypeScript** — strict mode on.
- **Tailwind CSS** — UI / control panel styling.
- **react-three-fiber + drei** — 3D.
- **Zustand** — lightweight shared state between sliders and the sim/scene.
- **Recharts** (or similar) — comparison line charts.
- ESLint + Prettier.

### 5.2 Separation of concerns

The simulation core in `lib/sim/` is **pure TypeScript with zero React/Three
imports** so it can be unit-tested headlessly and validated against the
closed-form formulas before any rendering exists.

---

## 6. Build Roadmap

1. **Sim core** — `rng`, `engine` (M/M/1), `queueing`, unit tests vs theory.
2. **Extend to M/M/c** — multi-server; validate Erlang-C.
3. **Economics** — profit/cost; order-type segmentation.
4. **Next.js shell** — Tailwind, layout, Zustand store wiring.
5. **3D scene** — ground, instanced customers, barista stations, queue lane.
6. **Controls** — mode switch, load/baristas/service sliders, sim speed, play/reset.
7. **Metrics + Compare** — live KPIs, single-vs-multi sweep charts.
8. **Polish** — camera, perf tuning, theory-vs-sim validation overlay.

---

## 7. Design Decisions

- **Play button model:** sim is paused at time 0. User configures params,
  presses Play, DES runs in one shot, animation replays the timeline. Reset
  stops and rewinds. This avoids confusion from auto-running on every slider
  change.
- **Sliders kept to essentials:** customer load, barista count, service time,
  sim speed. All other params (mix, wage, profit) use sensible defaults.
- **Poisson only:** deterministic arrivals removed for simplicity — Poisson is
  the standard queueing-theory assumption.
- **One shared FIFO queue** for both single and multi modes (M/M/c model).