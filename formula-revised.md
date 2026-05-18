# Formulas — Single vs. Multi Channel Coffee Shop Simulator

Base knowledge for the simulation model. This is a **deterministic** model:
one person = one drink = a fixed service time. No randomness, no queueing
theory, no probability distributions. Every formula below is plain arithmetic.

> **Core idea:** 1 person → 1 drink → takes exactly `serviceTime` minutes →
> person exits. Nothing is random. The same inputs always give the same output.

---

## 0. Project Goal & Hypothesis

**Goal:** Compare a single-queue system against a multi-queue system by
measuring how many drinks get completed in one hour, and whether converting
from single to multi channel earns the shop more profit.

**Hypothesis question:**
How many drinks per hour, and what profit per drink, are required for the shop
to come out ahead when converting from single channel to multi channel?

---

## 1. Fixed Input Variables (sliders)

| Variable          | Symbol | Range          | Default | Unit        |
|-------------------|--------|----------------|---------|-------------|
| Service time      | `s`    | 5 – 10         | 5       | min/drink   |
| Barista wage      | `w`    | 10 – 20        | 18      | $/hour      |
| Profit per drink  | `p`    | 1 – 5          | 3.50    | $/drink     |

Other constants used by the model:

| Constant            | Symbol | Value | Notes                          |
|---------------------|--------|-------|--------------------------------|
| Simulation horizon  | `H`    | 60    | minutes (one hour)             |
| Total customers     | `N`    | 100   | people who queue up that hour  |

Customer mix (fixed split of the 100 people):

| Channel  | Share | Count |
|----------|-------|-------|
| Walk-in  | 50%   | 50    |
| Delivery | 25%   | 25    |
| Pickup   | 25%   | 25    |

Each person orders exactly **1 drink**.

---

## 2. Throughput per Barista

A single barista works continuously and finishes one drink every `s` minutes.
In one hour:

```
drinksPerBarista = floor(H / s)
```

Examples:

| Service time `s` | drinksPerBarista (60 / s) |
|------------------|---------------------------|
| 5 min            | 12                        |
| 6 min            | 10                        |
| 7 min            | 8  (floor of 8.57)        |
| 8 min            | 7  (floor of 7.5)         |
| 10 min           | 6                         |

`floor` is used because a drink only counts if it finishes within the hour.

---

## 3. Scenario A — Single Channel

One shared queue. All 100 people line up together. Any free barista takes the
next person regardless of order type (walk-in / delivery / pickup all mixed).

### Drinks served

```
drinksServed_single = min( N , c · drinksPerBarista )
```

- `c` = number of baristas on shift
- `N` = 100 (people available that hour)

The `min(...)` caps output at the number of people actually in line — baristas
can't serve more drinks than there are customers.

| Baristas `c` | s = 5 min | Drinks served (capped at 100) |
|--------------|-----------|-------------------------------|
| 1            | 12        | 12                            |
| 2            | 24        | 24                            |
| 3            | 36        | 36                            |

Because the queue is shared, **no barista is ever idle while anyone is
waiting**. This is the efficiency advantage of single channel.

---

## 4. Scenario B — Multi Channel

Three separate queues, one per order type. A barista is assigned to one
channel and can **only** serve that channel. Orders never leak between
channels.

Assume `b` baristas per channel (default `b = 1`, so 3 baristas total).

### Drinks served per channel

Each channel is independent and capped by its own customer count:

```
drinksServed[channel] = min( customers[channel] , b · drinksPerBarista )
```

```
drinksServed_multi = drinksServed[walkin]
                   + drinksServed[delivery]
                   + drinksServed[pickup]
```

With `b = 1`, `s = 5` (drinksPerBarista = 12):

| Channel  | Customers | Capacity (1 × 12) | Drinks served |
|----------|-----------|-------------------|---------------|
| Walk-in  | 50        | 12                | 12            |
| Delivery | 25        | 12                | 12            |
| Pickup   | 25        | 12                | 12            |
| **Total**|           |                   | **36**        |

### The key trade-off

A multichannel barista sits **idle** when their own channel empties, even if
another channel still has a long line. This is the structural weakness the
simulation exposes: the delivery and pickup baristas finish their 25-person
lines but cannot help the 50-person walk-in line.

```
idleBaristaMinutes[channel] = max( 0 ,
    (b · drinksPerBarista − customers[channel]) · s )
```

If a channel has more customers than capacity, idle time is 0 (barista works
the full hour but leaves people unserved).

---

## 5. Comparing the Two Systems

To make the comparison fair, use the **same total barista count** in both
systems. With the default 3-channel setup that means `c = 3` baristas for
single channel vs. `b = 1` per channel (3 total) for multi channel.

```
extraDrinks = drinksServed_single − drinksServed_multi
```

- `extraDrinks > 0` → single channel served more (pooled baristas absorbed
  the uneven channel demand)
- `extraDrinks = 0` → both systems tied (happens when every channel has
  enough customers to keep its barista busy the whole hour)
- `extraDrinks < 0` → multi channel served more (only possible if the single
  queue had fewer total baristas)

---

## 6. Economic Model

### Revenue per hour

```
revenuePerHour = drinksServed × p
```

`drinksServed` is whichever scenario is being evaluated
(`drinksServed_single` or `drinksServed_multi`).

### Labor cost per hour

```
laborCostPerHour = totalBaristas × w
```

- Single channel: `totalBaristas = c`
- Multi channel:  `totalBaristas = b × 3`  (3 channels)

### Profit per hour

```
profitPerHour = revenuePerHour − laborCostPerHour
```

### Break-even: drinks needed to cover barista cost

The number of drinks that must be sold just to pay the baristas:

```
breakEvenDrinks = ceil( laborCostPerHour / p )
                = ceil( (totalBaristas × w) / p )
```

The shop is profitable when `drinksServed > breakEvenDrinks`.

---

## 7. Answering the Hypothesis

The simulator solves for the conditions where switching single → multi pays off.

### Profit difference of the switch

```
ΔProfit = profitPerHour_multi − profitPerHour_single
```

Expanded:

```
ΔProfit = (drinksServed_multi × p − baristas_multi × w)
        − (drinksServed_single × p − baristas_single × w)
```

If both systems use the same barista count, the wage terms cancel and:

```
ΔProfit = (drinksServed_multi − drinksServed_single) × p
```

This shows the switch only helps when multichannel serves at least as many
drinks — which, given pooled-vs-isolated baristas, depends entirely on whether
each channel has enough demand to keep its dedicated barista busy.

### Required profit-per-drink for the switch to break even

Setting `ΔProfit = 0` and solving for `p` (when barista counts differ):

```
p_required = (baristas_multi − baristas_single) × w
             ─────────────────────────────────────────
             (drinksServed_multi − drinksServed_single)
```

(Defined only when the denominator ≠ 0.)

### Required drinks-per-hour for the shop to profit at all

From Section 6, for any chosen system:

```
drinksNeeded = ceil( (totalBaristas × w) / p )
```

This is the headline answer the simulation reports for each scenario.

---

## 8. Simulation Outputs

For **each** scenario (single and multi), report:

| Output                  | Formula / source                         |
|-------------------------|------------------------------------------|
| Orders processed / hour | `drinksServed` (Section 3 or 4)          |
| Customers left unserved | `N − drinksServed`                       |
| Revenue per hour        | `drinksServed × p`                       |
| Labor cost per hour     | `totalBaristas × w`                      |
| Profit per hour         | `revenuePerHour − laborCostPerHour`      |
| Break-even drinks       | `ceil(laborCostPerHour / p)`             |
| Idle barista minutes    | multi only (Section 4)                   |

Plus the comparison: `extraDrinks` and `ΔProfit` (Sections 5 and 7).

### Chart / line graph

Plot **drinks completed over time** for both systems on one graph:

- X-axis: time, 0 → 60 min
- Y-axis: cumulative drinks completed
- Single channel line: `cumulativeDrinks(t) = min( N , c · floor(t / s) )`
- Multi channel line: sum of the three per-channel step functions, each
  `min( customers[ch] , b · floor(t / s) )`

Both lines are step functions that jump by the number of active baristas
every `s` minutes, then flatten when their customer pool runs out.

---

## 9. Visualization Rules

- **No abstract 3D model** for the order rack. Keep it literal and concrete:
  1 person = `s` minutes = 1 drink done.
- **One drink per person**, always. No multi-drink orders.
- The rack/queue view should simply show people advancing one slot every
  `s` minutes as their drink completes and they exit.

---

## 10. Worked Example (defaults)

Inputs: `s = 5`, `w = $18`, `p = $3.50`, `N = 100`, 3 baristas total.

**Single channel (c = 3):**
- drinksPerBarista = floor(60 / 5) = 12
- drinksServed = min(100, 3 × 12) = 36
- revenue = 36 × 3.50 = **$126.00**
- labor = 3 × 18 = **$54.00**
- profit = 126 − 54 = **$72.00**
- break-even = ceil(54 / 3.50) = **16 drinks**

**Multi channel (1 barista per channel):**
- walk-in: min(50, 12) = 12
- delivery: min(25, 12) = 12
- pickup: min(25, 12) = 12
- drinksServed = 36
- revenue = 36 × 3.50 = **$126.00**
- labor = 3 × 18 = **$54.00**
- profit = **$72.00**
- idle minutes: walk-in 0, delivery 0, pickup 0 (all channels saturated)

**Comparison:** at defaults the two tie (`ΔProfit = $0`) because every channel
has more customers than its single barista can serve in an hour. The systems
diverge only when service time rises or a channel's demand drops below its
barista's capacity — that is precisely the condition the simulator is built to
explore.