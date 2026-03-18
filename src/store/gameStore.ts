import { create } from 'zustand';
import {
  BuildingType,
  PlacedBuilding,
  GameEvent,
  Town,
  Notification,
  NotificationType,
  GamePhase,
  Resources,
  TerrainTool,
} from '../types';
import { BUILDING_DEFINITIONS, XP_PER_LEVEL } from '../game/config';
import {
  calculateProduction,
  calculatePopulationCap,
  calculateHappiness,
  checkRandomEvents,
  processRaid as processRaidFn,
} from '../services/gameEngine';

interface GameState {
  playerId: string;
  playerName: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  resources: Resources;
  population: number;
  populationCap: number;
  happiness: number;
  soldiers: number;
  buildings: PlacedBuilding[];
  events: GameEvent[];
  worldMap: Town[];
  selectedBuilding: BuildingType | null;
  selectedTerrainTool: TerrainTool | null;
  gamePhase: GamePhase;
  notifications: Notification[];
  tick: number;
  ticksSinceGrowth: number;
  festivalTicksLeft: number;
  worldSeed: number;
  terrainEdits: Record<string, number>;

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  placeBuilding: (type: BuildingType, x: number, y: number) => boolean;
  removeBuilding: (id: string) => void;
  trainSoldier: () => boolean;
  launchRaid: (targetTownId: string) => void;
  addResource: (resource: keyof Resources, amount: number) => void;
  consumeResource: (resources: Partial<Resources>) => boolean;
  addXP: (amount: number) => void;
  addEvent: (event: GameEvent) => void;
  addNotification: (message: string, type: NotificationType) => void;
  dismissNotification: (id: string) => void;
  setSelectedBuilding: (type: BuildingType | null) => void;
  setSelectedTerrainTool: (tool: TerrainTool | null) => void;
  clearSelection: () => void;
  raiseTerrain: (x: number, y: number, currentHeight: number) => boolean;
  lowerTerrain: (x: number, y: number, currentHeight: number) => boolean;
  updatePopulation: () => void;
  triggerEvent: () => void;
  setWorldMap: (towns: Town[]) => void;
  processTick: () => void;
  setInitialState: (state: Record<string, unknown>) => void;
  setWorldSeed: (seed: number) => void;
}

let notifId = 0;
let eventId = 0;

export const useGameStore = create<GameState>((set, get) => ({
  playerId: '',
  playerName: 'Lord Unknown',
  level: 1,
  xp: 0,
  xpToNextLevel: XP_PER_LEVEL(1),
  resources: {
    gold: 100,
    food: 50,
    wood: 50,
    stone: 30,
  },
  population: 0,
  populationCap: 5,
  happiness: 50,
  soldiers: 0,
  buildings: [],
  events: [],
  worldMap: [],
  selectedBuilding: null,
  selectedTerrainTool: null,
  gamePhase: 'building',
  notifications: [],
  tick: 0,
  ticksSinceGrowth: 0,
  festivalTicksLeft: 0,
  worldSeed: 1,
  terrainEdits: {},

  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setWorldSeed: (seed) => set({ worldSeed: seed }),

  setInitialState: (partial) => set(partial as Partial<GameState>),

  placeBuilding: (type, x, y) => {
    const state = get();
    const def = BUILDING_DEFINITIONS[type];

    // Check if tile is occupied
    const occupied = state.buildings.some(b => b.x === x && b.y === y);
    if (occupied) return false;

    // Check resources
    const cost = def.cost;
    if (
      (cost.gold ?? 0) > state.resources.gold ||
      (cost.food ?? 0) > state.resources.food ||
      (cost.wood ?? 0) > state.resources.wood ||
      (cost.stone ?? 0) > state.resources.stone
    ) {
      get().addNotification(`Not enough resources to build ${def.name}!`, 'warning');
      return false;
    }

    const newBuilding: PlacedBuilding = {
      id: `bld_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      x,
      y,
      level: 1,
      hp: 100,
      maxHp: 100,
    };

    set(s => ({
      buildings: [...s.buildings, newBuilding],
      resources: {
        gold: s.resources.gold - (cost.gold ?? 0),
        food: s.resources.food - (cost.food ?? 0),
        wood: s.resources.wood - (cost.wood ?? 0),
        stone: s.resources.stone - (cost.stone ?? 0),
      },
    }));

    get().addXP(10);
    get().addNotification(`${def.emoji} ${def.name} placed!`, 'success');

    const newState = get();
    const newCap = calculatePopulationCap(newState.buildings);
    const newHappiness = calculateHappiness(newState.buildings, newState.population);
    set({ populationCap: newCap, happiness: newHappiness });

    return true;
  },

  removeBuilding: (id) => {
    const state = get();
    const building = state.buildings.find(b => b.id === id);
    if (!building) return;

    const def = BUILDING_DEFINITIONS[building.type];
    const refund = {
      gold: Math.floor((def.cost.gold ?? 0) * 0.5),
      food: Math.floor((def.cost.food ?? 0) * 0.5),
      wood: Math.floor((def.cost.wood ?? 0) * 0.5),
      stone: Math.floor((def.cost.stone ?? 0) * 0.5),
    };

    set(s => ({
      buildings: s.buildings.filter(b => b.id !== id),
      resources: {
        gold: s.resources.gold + refund.gold,
        food: s.resources.food + refund.food,
        wood: s.resources.wood + refund.wood,
        stone: s.resources.stone + refund.stone,
      },
    }));

    get().addXP(2);
    get().addNotification(`${def.name} demolished. Recovered some resources.`, 'info');

    const newState = get();
    const newCap = calculatePopulationCap(newState.buildings);
    const newHappiness = calculateHappiness(newState.buildings, newState.population);
    set({ populationCap: newCap, happiness: newHappiness });
  },

  trainSoldier: () => {
    const state = get();
    const hasBarracks = state.buildings.some(b => b.type === BuildingType.BARRACKS);
    if (!hasBarracks) {
      get().addNotification('You need a Barracks to train soldiers!', 'warning');
      return false;
    }
    if (state.resources.food < 10 || state.resources.gold < 5) {
      get().addNotification('Not enough resources! Need 10 food + 5 gold.', 'warning');
      return false;
    }
    set(s => ({
      soldiers: s.soldiers + 1,
      resources: {
        ...s.resources,
        food: s.resources.food - 10,
        gold: s.resources.gold - 5,
      },
    }));
    get().addXP(5);
    get().addNotification('Soldier trained and ready!', 'success');
    return true;
  },

  launchRaid: (targetTownId) => {
    const state = get();
    const target = state.worldMap.find(t => t.id === targetTownId);
    if (!target) return;

    const result = processRaidFn(state.soldiers, target.soldiers, target.level);

    const event: GameEvent = {
      id: `evt_${++eventId}`,
      type: 'raid_result',
      message: result.message,
      severity: result.success ? 'success' : 'warning',
      timestamp: Date.now(),
    };

    set(s => ({
      soldiers: Math.max(0, s.soldiers - result.soldierLost),
      resources: {
        ...s.resources,
        gold: s.resources.gold + result.goldGained,
      },
      events: [event, ...s.events].slice(0, 50),
    }));

    get().addXP(result.xpGained);
    get().addNotification(result.message, result.success ? 'success' : 'danger');
  },

  addResource: (resource, amount) => {
    set(s => ({
      resources: {
        ...s.resources,
        [resource]: s.resources[resource] + amount,
      },
    }));
  },

  consumeResource: (resources) => {
    const state = get();
    const canAfford =
      (resources.gold ?? 0) <= state.resources.gold &&
      (resources.food ?? 0) <= state.resources.food &&
      (resources.wood ?? 0) <= state.resources.wood &&
      (resources.stone ?? 0) <= state.resources.stone;

    if (!canAfford) return false;

    set(s => ({
      resources: {
        gold: s.resources.gold - (resources.gold ?? 0),
        food: s.resources.food - (resources.food ?? 0),
        wood: s.resources.wood - (resources.wood ?? 0),
        stone: s.resources.stone - (resources.stone ?? 0),
      },
    }));
    return true;
  },

  addXP: (amount) => {
    set(s => {
      let xp = s.xp + amount;
      let level = s.level;
      let xpToNext = s.xpToNextLevel;

      while (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = XP_PER_LEVEL(level);
        // Level up side effects handled outside
      }

      if (level > s.level) {
        const notif: Notification = {
          id: `notif_${++notifId}`,
          message: `Level Up! You reached Level ${level}!`,
          type: 'success',
          timestamp: Date.now(),
        };
        const evt: GameEvent = {
          id: `evt_${++eventId}`,
          type: 'level_up',
          message: `You reached Level ${level}! New buildings and features may be unlocked.`,
          severity: 'success',
          timestamp: Date.now(),
        };
        return {
          xp,
          level,
          xpToNextLevel: xpToNext,
          notifications: [notif, ...s.notifications].slice(0, 5),
          events: [evt, ...s.events].slice(0, 50),
        };
      }

      return { xp, level, xpToNextLevel: xpToNext };
    });
  },

  addEvent: (event) => {
    set(s => ({ events: [event, ...s.events].slice(0, 50) }));
  },

  addNotification: (message, type) => {
    const notif: Notification = {
      id: `notif_${++notifId}`,
      message,
      type,
      timestamp: Date.now(),
    };
    set(s => ({ notifications: [notif, ...s.notifications].slice(0, 5) }));
    setTimeout(() => {
      get().dismissNotification(notif.id);
    }, 4000);
  },

  dismissNotification: (id) => {
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }));
  },

  setSelectedBuilding: (type) => set({
    selectedBuilding: type,
    selectedTerrainTool: type ? null : get().selectedTerrainTool,
  }),

  setSelectedTerrainTool: (tool) => set({
    selectedTerrainTool: tool,
    selectedBuilding: tool ? null : get().selectedBuilding,
  }),

  clearSelection: () => set({
    selectedBuilding: null,
    selectedTerrainTool: null,
  }),

  raiseTerrain: (x, y, currentHeight) => {
    const key = `${x},${y}`;
    if (currentHeight >= 6) {
      get().addNotification('This tile is already at the maximum build height.', 'warning');
      return false;
    }

    set(s => ({
      terrainEdits: {
        ...s.terrainEdits,
        [key]: Math.min(6, (s.terrainEdits[key] ?? 1) + 1),
      },
    }));
    get().addNotification('Terrain raised by one level.', 'success');
    return true;
  },

  lowerTerrain: (x, y, currentHeight) => {
    const key = `${x},${y}`;
    if (currentHeight <= 1) {
      get().addNotification('This tile is already at ground level.', 'warning');
      return false;
    }

    set(s => ({
      terrainEdits: {
        ...s.terrainEdits,
        [key]: Math.max(1, (s.terrainEdits[key] ?? 1) - 1),
      },
    }));
    get().addNotification('Terrain lowered by one level.', 'info');
    return true;
  },

  updatePopulation: () => {
    const state = get();
    const cap = calculatePopulationCap(state.buildings);
    const happiness = calculateHappiness(state.buildings, state.population);
    let pop = state.population;
    let ticksSinceGrowth = state.ticksSinceGrowth + 1;

    if (happiness > 60 && pop < cap && ticksSinceGrowth >= 3) {
      pop++;
      ticksSinceGrowth = 0;
      if (pop > 0 && pop % 10 === 0) {
        get().addXP(25);
        get().addNotification(`Population milestone: ${pop} citizens!`, 'info');
      }
    }

    set({ population: pop, populationCap: cap, happiness, ticksSinceGrowth });
  },

  triggerEvent: () => {
    const state = get();
    const { event, effects } = checkRandomEvents(
      state.population,
      state.happiness,
      state.buildings,
      state.soldiers
    );

    if (!event) return;

    set(s => {
      const updates: Partial<GameState> = {
        events: [event, ...s.events].slice(0, 50),
      };

      if (effects.populationChange) {
        updates.population = Math.max(0, s.population + effects.populationChange);
      }
      if (effects.happinessChange) {
        updates.happiness = Math.max(0, Math.min(100, s.happiness + effects.happinessChange));
      }
      if (effects.foodBonus) {
        updates.resources = { ...s.resources, food: s.resources.food + effects.foodBonus };
      }
      if (effects.destroyBuilding && s.buildings.length > 0) {
        const idx = Math.floor(Math.random() * s.buildings.length);
        updates.buildings = s.buildings.filter((_, i) => i !== idx);
      }
      if (effects.productionMultiplier) {
        updates.festivalTicksLeft = 5;
      }

      return updates;
    });

    get().addNotification(event.message, event.severity);
  },

  setWorldMap: (towns) => set({ worldMap: towns }),

  processTick: () => {
    const state = get();
    const production = calculateProduction(state.buildings);
    const festival = state.festivalTicksLeft > 0;
    const multiplier = festival ? 1.5 : 1;

    set(s => ({
      tick: s.tick + 1,
      festivalTicksLeft: Math.max(0, s.festivalTicksLeft - 1),
      resources: {
        gold: Math.floor(s.resources.gold + production.gold * multiplier),
        food: Math.floor(s.resources.food + production.food * multiplier - s.population * 0.5),
        wood: Math.floor(s.resources.wood + production.wood * multiplier),
        stone: Math.floor(s.resources.stone + production.stone * multiplier),
      },
    }));

    // Ensure no negative resources
    const cur = get().resources;
    set({
      resources: {
        gold: Math.max(0, cur.gold),
        food: Math.max(0, cur.food),
        wood: Math.max(0, cur.wood),
        stone: Math.max(0, cur.stone),
      }
    });

    get().updatePopulation();

    // Random events (10% chance per tick)
    if (Math.random() < 0.10) {
      get().triggerEvent();
    }

    // XP for surviving
    get().addXP(2);
  },
}));
