import { BuildingType, PlacedBuilding, GameEvent, Severity } from '../types';
import { BUILDING_DEFINITIONS, XP_ACTIONS } from '../game/config';

export interface ProductionResult {
  gold: number;
  food: number;
  wood: number;
  stone: number;
}

export function calculateProduction(buildings: PlacedBuilding[]): ProductionResult {
  const result: ProductionResult = { gold: 0, food: 0, wood: 0, stone: 0 };
  for (const b of buildings) {
    const def = BUILDING_DEFINITIONS[b.type];
    if (def.produces.gold) result.gold += def.produces.gold;
    if (def.produces.food) result.food += def.produces.food;
    if (def.produces.wood) result.wood += def.produces.wood;
    if (def.produces.stone) result.stone += def.produces.stone;
  }
  return result;
}

export function calculatePopulationCap(buildings: PlacedBuilding[]): number {
  let cap = 5; // base cap
  for (const b of buildings) {
    const def = BUILDING_DEFINITIONS[b.type];
    if (def.effect.populationCap) cap += def.effect.populationCap;
  }
  return cap;
}

export function calculateHappiness(buildings: PlacedBuilding[], population: number): number {
  let happiness = 50; // base happiness
  for (const b of buildings) {
    const def = BUILDING_DEFINITIONS[b.type];
    if (def.effect.happiness) happiness += def.effect.happiness;
  }
  // Overpopulation penalty
  const cap = calculatePopulationCap(buildings);
  if (population > cap * 0.9) {
    happiness -= 20;
  }
  return Math.max(0, Math.min(100, happiness));
}

export function calculateDefense(buildings: PlacedBuilding[], soldiers: number): number {
  let defense = soldiers * 10;
  for (const b of buildings) {
    const def = BUILDING_DEFINITIONS[b.type];
    if (def.effect.defense) defense += def.effect.defense;
  }
  return defense;
}

export interface RandomEventCheck {
  event: GameEvent | null;
  effects: {
    populationChange?: number;
    happinessChange?: number;
    foodBonus?: number;
    productionMultiplier?: number;
    destroyBuilding?: boolean;
  };
}

export function checkRandomEvents(
  population: number,
  happiness: number,
  buildings: PlacedBuilding[],
  soldiers: number
): RandomEventCheck {
  const rand = Math.random();
  const hasFarm = buildings.some(b => b.type === BuildingType.FARM);

  // Fire (10% chance, any time)
  if (rand < 0.10 && buildings.length > 0) {
    return {
      event: makeEvent('fire', 'danger', 'A fire broke out in your town! A building was destroyed.'),
      effects: { destroyBuilding: true, happinessChange: -10 }
    };
  }

  // Raid (pop > 20, ~5% chance)
  if (population > 20 && rand < 0.15) {
    const attackStrength = Math.floor(Math.random() * 15) + 5;
    const defense = calculateDefense(buildings, soldiers);
    if (attackStrength > defense) {
      return {
        event: makeEvent('raid', 'danger', `⚔️ Your town was raided! Attackers overwhelmed your defenses (ATK: ${attackStrength} vs DEF: ${defense}).`),
        effects: { populationChange: -Math.floor(Math.random() * 5) - 2, happinessChange: -15 }
      };
    } else {
      return {
        event: makeEvent('raid', 'warning', `⚔️ Raiders attacked but were repelled! (ATK: ${attackStrength} vs DEF: ${defense})`),
        effects: { happinessChange: 5 }
      };
    }
  }

  // Plague (pop > 30, ~3% chance)
  if (population > 30 && rand < 0.18) {
    return {
      event: makeEvent('plague', 'danger', '☠️ Plague has struck your town! Population and happiness drop.'),
      effects: { populationChange: -(Math.floor(Math.random() * 10) + 5), happinessChange: -20 }
    };
  }

  // Festival (happiness > 80, ~2% chance)
  if (happiness > 80 && rand < 0.20) {
    return {
      event: makeEvent('festival', 'success', '🎉 Festival! Citizens celebrate! Production boosted for a while.'),
      effects: { productionMultiplier: 1.5, happinessChange: 5 }
    };
  }

  // Good harvest (farm exists, ~4% chance)
  if (hasFarm && rand < 0.22) {
    return {
      event: makeEvent('good_harvest', 'success', '🌾 Excellent harvest! Your farms produced extra food.'),
      effects: { foodBonus: 50 }
    };
  }

  return { event: null, effects: {} };
}

function makeEvent(type: GameEvent['type'], severity: Severity, message: string): GameEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    message,
    severity,
    timestamp: Date.now(),
  };
}

export interface RaidResult {
  success: boolean;
  message: string;
  goldGained: number;
  soldierLost: number;
  xpGained: number;
}

export function processRaid(
  attackerSoldiers: number,
  defenderSoldiers: number,
  defenderLevel: number
): RaidResult {
  if (attackerSoldiers === 0) {
    return {
      success: false,
      message: 'You have no soldiers to send on a raid!',
      goldGained: 0,
      soldierLost: 0,
      xpGained: 0,
    };
  }
  const attackPower = attackerSoldiers * (1 + Math.random() * 0.5);
  const defensePower = defenderSoldiers * (1 + Math.random() * 0.5) + defenderLevel * 5;
  const soldierLost = Math.max(1, Math.floor(attackerSoldiers * 0.2));

  if (attackPower > defensePower) {
    const goldGained = Math.floor(Math.random() * 50 + 20 + defenderLevel * 10);
    return {
      success: true,
      message: `Raid successful! Your forces crushed the defenders and looted ${goldGained} gold!`,
      goldGained,
      soldierLost,
      xpGained: XP_ACTIONS.WIN_RAID,
    };
  } else {
    return {
      success: false,
      message: `Raid failed! The defenders were too strong. You lost ${soldierLost} soldiers.`,
      goldGained: 0,
      soldierLost: soldierLost + Math.floor(attackerSoldiers * 0.3),
      xpGained: XP_ACTIONS.LOSE_RAID,
    };
  }
}

export function calculateXP(action: keyof typeof XP_ACTIONS): number {
  return XP_ACTIONS[action];
}

const ADJECTIVES = [
  'Iron', 'Stone', 'Green', 'Dark', 'Silver', 'Golden', 'Frost', 'Ember',
  'Storm', 'Bright', 'Shadow', 'Timber', 'Ash', 'Cobalt', 'Crimson', 'Swift'
];
const NOUNS = [
  'Hold', 'Forge', 'Keep', 'Haven', 'Reach', 'Vale', 'Watch', 'Gate',
  'Crest', 'Peak', 'Ridge', 'Falls', 'Moor', 'Ford', 'Holm', 'Wick'
];

export function generateTownName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
}
