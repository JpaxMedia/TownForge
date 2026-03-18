import { BuildingType, BuildingDef } from '../types';

export const GRID_SIZE = 20;
export const TILE_SIZE = 48;
export const ISO_TILE_WIDTH = 96;
export const ISO_TILE_HEIGHT = 48;
export const TERRAIN_ELEVATION = 22;
export const TICK_INTERVAL = 5000;
export const POPULATION_GROWTH_TICKS = 3;
export const HAPPINESS_GROWTH_THRESHOLD = 60;
export const EVENT_POPULATION_THRESHOLD = 20;

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDef> = {
  [BuildingType.HOUSE]: {
    type: BuildingType.HOUSE,
    name: 'House',
    cost: { wood: 20, stone: 10 },
    produces: {},
    effect: { populationCap: 10, happiness: 5 },
    description: 'Homes for your citizens. Increases population cap and happiness.',
    color: 0xCD853F,
    roofColor: 0x8B2E16,
    renderHeight: 34,
    footprintScale: 0.68,
    emoji: '🏠',
  },
  [BuildingType.FARM]: {
    type: BuildingType.FARM,
    name: 'Farm',
    cost: { wood: 15, stone: 5 },
    produces: { food: 5 },
    effect: {},
    description: 'Produces food each tick to feed your population.',
    color: 0x6B8E23,
    roofColor: 0x8EAA2D,
    renderHeight: 14,
    footprintScale: 0.9,
    emoji: '🌾',
  },
  [BuildingType.MARKET]: {
    type: BuildingType.MARKET,
    name: 'Market',
    cost: { wood: 25, stone: 10, gold: 20 },
    produces: { gold: 8 },
    effect: {},
    description: 'Generates gold through trade and commerce.',
    color: 0xFFD700,
    roofColor: 0xF28C28,
    renderHeight: 28,
    footprintScale: 0.76,
    emoji: '🏪',
  },
  [BuildingType.LUMBER_MILL]: {
    type: BuildingType.LUMBER_MILL,
    name: 'Lumber Mill',
    cost: { stone: 10 },
    produces: { wood: 6 },
    effect: {},
    description: 'Processes timber into usable wood planks.',
    color: 0x8B4513,
    roofColor: 0x5C3317,
    renderHeight: 24,
    footprintScale: 0.74,
    emoji: '🪵',
  },
  [BuildingType.QUARRY]: {
    type: BuildingType.QUARRY,
    name: 'Quarry',
    cost: { wood: 15 },
    produces: { stone: 4 },
    effect: {},
    description: 'Mines stone from the earth.',
    color: 0xA9A9A9,
    roofColor: 0x707B84,
    renderHeight: 16,
    footprintScale: 0.86,
    emoji: '⛏️',
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    name: 'Barracks',
    cost: { wood: 30, stone: 20, gold: 30 },
    produces: {},
    effect: { defense: 20 },
    description: 'Train soldiers to defend your town and raid others.',
    color: 0x8B0000,
    roofColor: 0x4A0000,
    renderHeight: 32,
    footprintScale: 0.8,
    emoji: '⚔️',
  },
  [BuildingType.WALL]: {
    type: BuildingType.WALL,
    name: 'Wall',
    cost: { stone: 5 },
    produces: {},
    effect: { defense: 10 },
    description: 'Stone walls protect your town from raids.',
    color: 0x696969,
    roofColor: 0x8A8A8A,
    renderHeight: 18,
    footprintScale: 0.98,
    emoji: '🧱',
  },
  [BuildingType.WATCH_TOWER]: {
    type: BuildingType.WATCH_TOWER,
    name: 'Watch Tower',
    cost: { wood: 15, stone: 10 },
    produces: {},
    effect: { defense: 15 },
    description: 'Provides early warning of incoming raids.',
    color: 0x8B6914,
    roofColor: 0x5A4410,
    renderHeight: 48,
    footprintScale: 0.54,
    emoji: '🗼',
  },
  [BuildingType.TEMPLE]: {
    type: BuildingType.TEMPLE,
    name: 'Temple',
    cost: { wood: 20, stone: 15, gold: 15 },
    produces: {},
    effect: { happiness: 15 },
    description: 'A place of worship that greatly boosts happiness.',
    color: 0x9370DB,
    roofColor: 0xD8C6FF,
    renderHeight: 36,
    footprintScale: 0.72,
    emoji: '⛪',
  },
};

export const XP_ACTIONS = {
  PLACE_BUILDING: 10,
  REMOVE_BUILDING: 2,
  TRAIN_SOLDIER: 5,
  SURVIVE_RAID: 50,
  WIN_RAID: 30,
  LOSE_RAID: 10,
  POPULATION_MILESTONE: 25,
  FESTIVAL: 15,
};

export const XP_PER_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));
