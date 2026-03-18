import { Town } from '../types';
import { generateTownName } from './gameEngine';

const LS_PREFIX = 'townforge_';
const WORLD_TOWNS_KEY = `${LS_PREFIX}world_towns`;

// Attempt Firebase ops but always fall back to localStorage
async function tryFirebase<T>(
  fn: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback();
  }
}

export async function saveGameState(playerId: string, state: object): Promise<void> {
  const key = `${LS_PREFIX}player_${playerId}`;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export async function loadGameState(playerId: string): Promise<object | null> {
  const key = `${LS_PREFIX}player_${playerId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return null;
}

export function generateAITowns(): Town[] {
  const count = 6 + Math.floor(Math.random() * 4);
  const towns: Town[] = [];
  for (let i = 0; i < count; i++) {
    const level = Math.floor(Math.random() * 10) + 1;
    towns.push({
      id: `ai_town_${i}`,
      name: generateTownName(),
      ownerId: `ai_${i}`,
      population: Math.floor(Math.random() * 40) + 5,
      level,
      soldiers: Math.floor(Math.random() * 20),
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
    });
  }
  return towns;
}

export async function getWorldTowns(): Promise<Town[]> {
  try {
    const raw = localStorage.getItem(WORLD_TOWNS_KEY);
    if (raw) {
      const towns = JSON.parse(raw);
      if (Array.isArray(towns) && towns.length > 0) return towns;
    }
  } catch {}
  const towns = generateAITowns();
  localStorage.setItem(WORLD_TOWNS_KEY, JSON.stringify(towns));
  return towns;
}

export async function syncTown(town: Town): Promise<void> {
  try {
    const raw = localStorage.getItem(WORLD_TOWNS_KEY);
    let towns: Town[] = raw ? JSON.parse(raw) : [];
    const idx = towns.findIndex(t => t.id === town.id);
    if (idx >= 0) {
      towns[idx] = town;
    } else {
      towns.push(town);
    }
    localStorage.setItem(WORLD_TOWNS_KEY, JSON.stringify(towns));
  } catch (e) {
    console.error('Failed to sync town:', e);
  }
}

export function getOrCreatePlayerId(): string {
  const key = `${LS_PREFIX}player_id`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'player_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(key, id);
  }
  return id;
}

export function getOrCreatePlayerName(): string {
  const key = `${LS_PREFIX}player_name`;
  let name = localStorage.getItem(key);
  if (!name) {
    name = generateTownName() + 'Lord';
    localStorage.setItem(key, name);
  }
  return name;
}

export function setPlayerName(name: string): void {
  localStorage.setItem(`${LS_PREFIX}player_name`, name);
}
