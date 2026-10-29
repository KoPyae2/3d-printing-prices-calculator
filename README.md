# PolyCrafy

A price calculator for a 3D printing shop in Myanmar. Built as an offline-first
PWA that installs to the home screen and works without a connection.

## How the price is built

The calculation follows what a small FDM shop actually pays for, in MMK:

```
filament    = weight (g) × quantity × (spool price ÷ spool weight)
waste       = filament × waste %
machine     = printing hours × (machine per hour + electricity per hour)
electricity = (printer watts ÷ 1000) × tariff per kWh
setup       = setup minutes ÷ 60 × your hourly rate     (once per quote)
extras      = Σ add-on price × quantity
design      = selected design fee                       (once per quote)
cost        = filament + waste + machine + setup + extras + design
price       = cost + profit %
total       = max(price, minimum charge), then rounded
```

Printing hours scale with quantity because five copies really do take five times
as long. Setup time is charged once, because the plate is prepared once.

Rounding supports three modes: always up (the default, matching how counter
prices are quoted), nearest, and exact.

### Default values

| Setting | Default | Why |
| --- | --- | --- |
| PLA spool | 38,000 MMK / 1 kg | Street price; works out at 38 MMK per gram |
| Electricity | 200 MMK/kWh at 120 W | About 24 MMK per printing hour |
| Machine | 400 MMK/hour | Nozzles, wear and upkeep |
| Your time | 3,000 MMK/hour | Setup and handling |
| Setup | 15 minutes | Slicing, plate prep, removal |
| Waste | 5% | Failed prints and purge |
| Profit | 40% | On the full cost, not one line |
| Minimum charge | 5,000 MMK | Nothing is quoted below this |
| Rounding | Up to 500 MMK | Reads like a counter price |

A 100 g part with five hours of printing comes out around 18,500 MMK, which is
about 92 MMK per gram. Every figure is editable in Settings, so the app follows
your shop rather than the other way round.

## Screens

- **Calculate** — filament, weight, quantity, print time, design fee, extras.
  Live total pinned at the top, full cost breakdown underneath.
- **Quotes** — searchable history with sorting, detail, duplicate, re-price and
  text voucher sharing.
- **Settings** — studio profile, costs and profit, filaments, design fees,
  extras, appearance, backup and restore.

## Notes for phones

The viewport is locked, so the page never zooms or bounces sideways. Every
input is 16 px, which stops iOS Safari zooming when a field is focused. Editors
open inline under the row being edited rather than in a sheet, so the keyboard
never covers the fields.

## Stack

React 19, TypeScript (strict), Vite 7, vite-plugin-pwa. No runtime dependencies
beyond React. Plain CSS with design tokens, inline SVG icons, a hash router and a
small `useSyncExternalStore` store persisted to localStorage.

## Commands

```bash
npm install
npm run dev       # local development
npm test          # pricing and migration tests (node --test)
npm run lint
npm run build     # typecheck + production build
npm run preview   # serve the built PWA, including the service worker
```

The service worker is only active in the built app, so test offline behaviour
with `npm run preview`.

## Upgrading from the first version

Settings saved by the earlier price-per-gram model are migrated on load:
filament prices become spool prices, and old rate fields map onto the new ones.
Quotes saved under the old model keep the exact total that was agreed with the
customer and are marked as older quotes in the app. Nothing is repriced.
