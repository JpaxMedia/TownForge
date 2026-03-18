export enum BuildingType {
  HOUSE = 'HOUSE',
  FARM = 'FARM',
  MARKET = 'MARKET',
  LUMBER_MILL = 'LUMBER_MILL',
  QUARRY = 'QUARRY',
  BARRACKS = 'BARRACKS',
  WALL = 'WALL',
  WATCH_TOWER = 'WATCH_TOWER',
  TEMPLE = 'TEMPLE',
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
}

export interface Resources {
  gold: number;
  food: number;
  wood: number;
  stone: number;
}

export type EventType =
  | 'raid'
  | 'plague'
  | 'festival'
  | 'good_harvest'
  | 'fire'
  | 'level_up'
  | 'building_placed'
  | 'building_removed'
  | 'raid_result'
  | 'soldier_trained';

export type Severity = 'info' | 'warning' | 'danger' | 'success';

export interface GameEvent {
  id: string;
  type: EventType;
  message: string;
  severity: Severity;
  timestamp: number;
  duration?: number;
}

export interface Town {
  id: string;
  name: string;
  ownerId: string;
  population: number;
  level: number;
  soldiers: number;
  x: number;
  y: number;
}

export interface BuildingCost {
  gold?: number;
  food?: number;
  wood?: number;
  stone?: number;
}

export interface BuildingProduction {
  gold?: number;
  food?: number;
  wood?: number;
  stone?: number;
}

export interface BuildingEffect {
  populationCap?: number;
  happiness?: number;
  defense?: number;
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  cost: BuildingCost;
  produces: BuildingProduction;
  effect: BuildingEffect;
  description: string;
  color: number;
  roofColor: number;
  renderHeight: number;
  footprintScale: number;
  emoji: string;
}

export type TerrainBiome = 'meadow' | 'grove' | 'ridge' | 'clay';

export type TerrainTool = 'raise' | 'lower';

export interface TerrainCell {
  x: number;
  y: number;
  height: number;
  biome: TerrainBiome;
}

export type NotificationType = 'info' | 'warning' | 'danger' | 'success';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
}

export interface RaidResult {
  success: boolean;
  message: string;
  goldGained: number;
  soldierLost: number;
  xpGained: number;
}

export type GamePhase = 'building' | 'combat' | 'event';
