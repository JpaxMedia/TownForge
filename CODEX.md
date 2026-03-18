# TownForge — Codex

Full technical rundown of what was built, how it works, and where everything lives.

---

## What It Is

TownForge is a browser-based city-builder game in the style of classic blocky/pixel-art builders (think Minecraft meets a medieval city sim). The player starts with a blank 20×20 grid, places buildings, grows a population, trains soldiers, and raids AI-controlled towns on a world map. The game runs entirely in the browser — no backend required.

**Live URL:** https://townforge.vercel.app
**GitHub:** https://github.com/JpaxMedia/TownForge

---

## Tech Stack

| Layer | Tool |
|---|---|
| Game engine | Phaser 3 (v3.70) |
| UI framework | React 18 + TypeScript |
| State management | Zustand |
| Styling | Tailwind CSS |
| Build tool | Vite 5 |
| PWA | vite-plugin-pwa (Workbox) |
| Persistence | localStorage (Firebase config exists but is unused — pure offline fallback) |
| Deployment | Vercel (auto-deploy from GitHub) |

---

## Project Structure

```
src/
├── types/index.ts              # All shared TypeScript types and enums
├── game/
│   ├── config.ts               # Game constants: grid size, tick rate, all building definitions, XP table
│   ├── PhaserGame.tsx          # React component that mounts/unmounts the Phaser canvas
│   └── scenes/
│       ├── PreloadScene.ts     # Generates all textures procedurally (no image files)
│       ├── MainGameScene.ts    # Core game loop: grid, input, camera, tick timer, building sync
│       └── UIScene.ts          # Phaser-side UI overlay (floating text, etc.)
├── store/
│   └── gameStore.ts            # Zustand store — single source of truth for all game state
├── services/
│   ├── gameEngine.ts           # Pure functions: production math, happiness, defense, events, raids
│   └── worldService.ts         # localStorage persistence + AI town generation
├── components/
│   ├── GameWrapper.tsx         # Top-level wrapper; initialises player ID/name, loads save, seeds world map
│   ├── HUD.tsx                 # Top bar: resources (gold/food/wood/stone), population, happiness, level/XP bar
│   ├── BuildingPanel.tsx       # Left sidebar: building selector cards with cost and description
│   ├── MilitaryPanel.tsx       # Right sidebar: soldier count, train button, world map raid list
│   ├── EventLog.tsx            # Bottom-right scrollable event log (last 50 events)
│   ├── NotificationToast.tsx   # Floating toast notifications (auto-dismiss after 4s)
│   └── WorldMap.tsx            # Modal overlay showing AI towns as dots, click to raid
├── firebase/config.ts          # Firebase SDK init (stub — app works without credentials)
├── App.tsx                     # Root component, renders GameWrapper
├── main.tsx                    # Vite entry point
└── index.css                   # Tailwind base + custom scrollbar styles
```

---

## Core Systems

### 1. Procedural Textures (`PreloadScene.ts`)

Zero image files. Every texture is drawn at runtime using Phaser's `Graphics` API and baked via `generateTexture()`. The `makeBlockTexture()` helper takes a base color, shadow color, and an array of pixel-art "detail rects" and stamps them onto a 48×48 canvas. This produces:

- `grass` — green tile with pixel scatter details and darker border edges
- `hover` / `selected` — semi-transparent white/yellow overlay tiles
- `HOUSE`, `FARM`, `MARKET`, `LUMBER_MILL`, `QUARRY`, `BARRACKS`, `WALL`, `WATCH_TOWER`, `TEMPLE` — each a unique blocky sprite
- `soldier` — red/gold pixel-art soldier silhouette

### 2. The Grid (`MainGameScene.ts`)

- 20×20 grid of 48×48px tiles (`GRID_SIZE = 20`, `TILE_SIZE = 48` in `config.ts`)
- All tiles live inside a `Phaser.GameObjects.Container` (`gridContainer`) for easy camera/zoom control
- Each tile is interactive: `pointerover` shows hover overlay, left-click places the selected building, right-click demolishes
- Camera pans with WASD or arrow keys; scroll wheel zooms between 0.4× and 2.5×
- Context menu is suppressed on the canvas (right-click is reserved for demolish)
- Building sprites are managed in a `Map<id, Container>`. Zustand store subscription diffs `state.buildings` on every change and adds/removes sprites accordingly — no full re-render

### 3. Game State (`gameStore.ts`)

Single Zustand store. Key slices:

| Field | Type | Description |
|---|---|---|
| `resources` | `{gold, food, wood, stone}` | Current stockpiles |
| `population` / `populationCap` | number | Current vs max citizens |
| `happiness` | 0–100 | Drives growth and festival events |
| `soldiers` | number | Military strength |
| `buildings` | `PlacedBuilding[]` | Every placed building (id, type, x, y, level, hp) |
| `events` | `GameEvent[]` | Last 50 events for the log |
| `worldMap` | `Town[]` | AI towns available to raid |
| `level` / `xp` / `xpToNextLevel` | number | Player progression |
| `tick` | number | Total ticks elapsed |
| `festivalTicksLeft` | number | Ticks remaining on a production bonus |

Key actions: `placeBuilding`, `removeBuilding`, `trainSoldier`, `launchRaid`, `processTick`, `triggerEvent`, `addXP`, `updatePopulation`.

### 4. Game Engine (pure functions in `gameEngine.ts`)

All the math lives here, decoupled from the store:

- **`calculateProduction(buildings)`** — sums per-tick resource output from all placed buildings
- **`calculatePopulationCap(buildings)`** — base 5 + `populationCap` bonus from Houses
- **`calculateHappiness(buildings, population)`** — base 50 + happiness bonuses (Temples etc.) − 20 if population > 90% of cap
- **`calculateDefense(buildings, soldiers)`** — soldiers × 10 + defense bonuses from Walls/Watch Towers/Barracks
- **`checkRandomEvents(...)`** — weighted random event picker (see Events section below)
- **`processRaid(attackers, defenders, defenderLevel)`** — combat roll with random variance; returns gold gained, soldiers lost, XP gained
- **`generateTownName()`** — picks from 16 adjectives × 16 nouns to name AI towns (e.g. "IronForge", "ShadowHold")

### 5. Tick System

`MainGameScene` fires a Phaser `TimerEvent` every **5 000 ms** (`TICK_INTERVAL`). Each tick calls `processTick()` on the store, which:

1. Calculates production from all buildings (×1.5 if a Festival is active)
2. Deducts food for population upkeep (`population × 0.5` per tick)
3. Clamps all resources to ≥ 0
4. Calls `updatePopulation()` — grows pop by 1 every 3 ticks if happiness > 60 and pop < cap
5. 10% chance to call `triggerEvent()` (random world event)
6. Awards 2 XP for surviving the tick

The game also auto-saves to localStorage every **30 seconds** via a separate timer.

### 6. Buildings

Defined in `config.ts` as `BUILDING_DEFINITIONS` — a record keyed by `BuildingType` enum:

| Building | Cost | Produces (per tick) | Effect |
|---|---|---|---|
| 🏠 House | 20 wood, 10 stone | — | +10 pop cap, +5 happiness |
| 🌾 Farm | 15 wood, 5 stone | +5 food | — |
| 🏪 Market | 25 wood, 10 stone, 20 gold | +8 gold | — |
| 🪵 Lumber Mill | 10 stone | +6 wood | — |
| ⛏️ Quarry | 15 wood | +4 stone | — |
| ⚔️ Barracks | 30 wood, 20 stone, 30 gold | — | +20 defense |
| 🧱 Wall | 5 stone | — | +10 defense |
| 🗼 Watch Tower | 15 wood, 10 stone | — | +15 defense |
| ⛪ Temple | 20 wood, 15 stone, 15 gold | — | +15 happiness |

Demolishing a building refunds 50% of its build cost.

### 7. Random Events (`checkRandomEvents` in `gameEngine.ts`)

Called on every tick with 10% probability. Events are checked in priority order with raw `Math.random()` thresholds:

| Event | Condition | Probability | Effect |
|---|---|---|---|
| 🔥 Fire | Buildings exist | 10% | Destroys a random building, −10 happiness |
| ⚔️ Raid | Population > 20 | 5% (after fire) | ATK vs DEF roll → population loss + happiness drop, or repelled |
| ☠️ Plague | Population > 30 | 3% | −5–15 population, −20 happiness |
| 🎉 Festival | Happiness > 80 | 2% | ×1.5 production for 5 ticks, +5 happiness |
| 🌾 Good Harvest | Farm exists | 2% | +50 food |

### 8. Military & Raids

- **Training:** Requires a Barracks. Costs 10 food + 5 gold. Awards 5 XP.
- **Raiding:** Player picks a target town from the World Map. Combat uses `processRaid()`:
  - `attackPower = soldiers × (1 + rand × 0.5)`
  - `defensePower = enemySoldiers × (1 + rand × 0.5) + enemyLevel × 5`
  - Win: loot `rand(50) + 20 + enemyLevel × 10` gold, lose 20% of soldiers, gain 30 XP
  - Lose: gain 10 XP, lose 20–50% of soldiers

### 9. Leveling

`XP_PER_LEVEL(level) = floor(100 × 1.5^(level−1))` — exponential curve capping late game grind.

XP sources:
- Place building: +10 XP
- Demolish building: +2 XP
- Train soldier: +5 XP
- Survive raid (defending): +50 XP
- Win raid (attacking): +30 XP
- Lose raid: +10 XP
- Every population milestone (×10 citizens): +25 XP
- Every tick survived: +2 XP

Level-up triggers a toast notification and an event log entry.

### 10. Persistence (`worldService.ts`)

All data saved under `townforge_*` keys in `localStorage`:

| Key | Content |
|---|---|
| `townforge_player_id` | UUID generated on first visit |
| `townforge_player_name` | Generated name (e.g. "IronForge Lord") |
| `townforge_player_{id}` | JSON snapshot of level, XP, resources, population, soldiers, buildings, happiness, tick |
| `townforge_world_towns` | Array of AI town objects |

`GameWrapper.tsx` loads the saved state on mount and hydrates the store via `setInitialState()`. The Firebase SDK is imported but all calls fall back to localStorage — zero Firebase credentials needed.

### 11. UI Components

- **HUD** — fixed top bar with live resource counts, population/cap, happiness%, level badge, and an XP progress bar
- **BuildingPanel** — fixed left panel; clicking a card sets `selectedBuilding` in the store, which MainGameScene reads to place on next tile click
- **MilitaryPanel** — fixed right panel; shows soldier count, train button, world map button
- **WorldMap** — full-screen modal with a dark canvas showing AI towns as colored dots at their `(x,y)` coordinates; clicking a town launches a raid
- **EventLog** — fixed bottom-right; shows the last 50 game events color-coded by severity (info/warning/danger/success)
- **NotificationToast** — floating top-right toasts, max 5 visible, auto-dismissed after 4 seconds

### 12. PWA

`vite-plugin-pwa` generates a Service Worker (Workbox `generateSW` strategy) that precaches all build assets. `public/manifest.json` declares the app name, icons, and `"display": "standalone"` so it can be added to a home screen on mobile.

---

## Build & Deploy

```bash
npm install       # install deps
npm run dev       # local dev at http://localhost:5173
npm run build     # TypeScript compile + Vite production build → dist/
npm run preview   # preview the production build locally
vercel --prod     # deploy to Vercel (already configured)
```

The Vercel project (`jpaxmedias-projects/townforge`) is linked. Every `vercel --prod` redeploys from the current `dist/`. To wire up auto-deploy on git push, connect the GitHub repo inside the Vercel dashboard.

---

## Bugs Fixed During Initial Deployment

1. **Duplicate code blocks** — `MilitaryPanel.tsx` and `gameStore.ts` both had their closing `}` / `}))` block copy-pasted a second time at the end of the file, causing TS parse errors `TS1128` / `TS1109`. Removed the duplicate tails.
2. **Phaser `make.graphics` type error** — `this.make.graphics({ x: 0, y: 0, add: false })` threw `TS2353` because `add` is not part of the Phaser 3 `Graphics.Types.Options` interface in v3.70. Removed the `add` property (Phaser handles it internally).

---

## Potential Next Steps

- **Firebase Realtime Database** — the `firebase/config.ts` stub is already in place; swap `worldService.ts` localStorage calls for Firestore reads/writes to enable shared world maps between players
- **Building upgrades** — `PlacedBuilding.level` field already exists; add an upgrade action that multiplies production and costs resources
- **Fog of war** — reveal the world map as you level up or explore
- **Tech tree** — gate higher buildings (e.g. Barracks requires a Market) behind player level
- **Mobile touch input** — pan with single-finger drag, pinch-to-zoom (Phaser supports this natively via `this.input.addPointer`)
- **Animated sprites** — replace static textures with sprite sheets using `anims.create()` for smoke, crop growth, soldier march
- **Sound** — Phaser's `this.sound` API + Web Audio for ambient music and SFX
