import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { processRaid } from '../services/gameEngine';
import { GameEvent, Town } from '../types';

interface WorldMapProps {
  onClose: () => void;
}

let wmEventId = 0;

export default function WorldMap({ onClose }: WorldMapProps) {
  const { worldMap, playerName, level, population, soldiers } = useGameStore(s => ({
    worldMap: s.worldMap,
    playerName: s.playerName,
    level: s.level,
    population: s.population,
    soldiers: s.soldiers,
  }));
  const addEvent = useGameStore(s => s.addEvent);
  const addNotification = useGameStore(s => s.addNotification);
  const addXP = useGameStore(s => s.addXP);

  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [raidResult, setRaidResult] = useState<string | null>(null);

  // Player's "town" for display
  const playerTown: Town = {
    id: 'player',
    name: playerName,
    ownerId: 'player',
    population,
    level,
    soldiers,
    x: 400,
    y: 300,
  };

  const allTowns = [playerTown, ...worldMap];

  const handleRaid = (target: Town) => {
    const store = useGameStore.getState();
    if (store.soldiers === 0) {
      setRaidResult('You need soldiers to raid!');
      return;
    }
    const result = processRaid(store.soldiers, target.soldiers, target.level);
    const event: GameEvent = {
      id: `wm_raid_${++wmEventId}`,
      type: 'raid_result',
      message: result.message,
      severity: result.success ? 'success' : 'warning',
      timestamp: Date.now(),
    };
    addEvent(event);
    addNotification(result.message, result.success ? 'success' : 'danger');
    useGameStore.setState(s => ({
      soldiers: Math.max(0, s.soldiers - result.soldierLost),
      resources: { ...s.resources, gold: s.resources.gold + result.goldGained },
    }));
    addXP(result.xpGained);
    setRaidResult(result.message);
  };

  return (
    <div className="absolute inset-4 sm:inset-8 z-20 pointer-events-auto flex items-center justify-center">
      <div className="bg-gray-950/98 border-3 border-green-800 shadow-minecraft w-full max-w-2xl max-h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-green-950/80 border-b-2 border-green-800 px-3 py-2 shrink-0">
          <span className="text-green-300 font-minecraft font-bold text-sm">🗺️ WORLD MAP</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-minecraft text-lg">✕</button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Map area */}
          <div className="flex-1 relative bg-green-950/30 border-r border-gray-800 overflow-hidden" style={{ minHeight: 200 }}>
            <div className="absolute inset-0">
              {/* Background grid */}
              <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a7c4e" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Towns */}
              {allTowns.map(town => {
                const isPlayer = town.id === 'player';
                const isSelected = selectedTown?.id === town.id;
                const xPct = (town.x / 800) * 100;
                const yPct = (town.y / 600) * 100;
                return (
                  <button
                    key={town.id}
                    onClick={() => !isPlayer && setSelectedTown(town)}
                    className={`
                      absolute transform -translate-x-1/2 -translate-y-1/2
                      transition-transform hover:scale-110
                    `}
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  >
                    <div className={`
                      w-4 h-4 border-2 rotate-45 transition-all
                      ${isPlayer ? 'bg-yellow-400 border-yellow-200 w-5 h-5' :
                        isSelected ? 'bg-red-500 border-red-300' :
                        'bg-gray-500 border-gray-300 hover:bg-blue-500'}
                    `} />
                    <div className={`
                      absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap
                      text-[8px] font-minecraft
                      ${isPlayer ? 'text-yellow-300' : 'text-gray-300'}
                    `}>
                      {town.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 text-[9px] font-minecraft text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 border border-yellow-200 rotate-45" />
                <span>Your Town</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-3 h-3 bg-gray-500 border border-gray-300 rotate-45" />
                <span>Enemy Town</span>
              </div>
            </div>
          </div>

          {/* Town info panel */}
          <div className="w-full sm:w-56 p-3 flex flex-col gap-2 overflow-y-auto">
            {raidResult && (
              <div className="bg-yellow-900/50 border border-yellow-700 px-2 py-1 text-yellow-200 font-minecraft text-[10px]">
                {raidResult}
                <button onClick={() => setRaidResult(null)} className="ml-1 text-gray-400">✕</button>
              </div>
            )}

            {selectedTown ? (
              <div>
                <div className="text-yellow-300 font-minecraft font-bold text-sm">{selectedTown.name}</div>
                <div className="mt-1 space-y-0.5 text-xs font-minecraft">
                  <div className="text-gray-300">Level: <span className="text-white">{selectedTown.level}</span></div>
                  <div className="text-gray-300">Population: <span className="text-green-300">{selectedTown.population}</span></div>
                  <div className="text-gray-300">Soldiers: <span className="text-red-300">{selectedTown.soldiers}</span></div>
                </div>
                <div className="mt-2 text-[9px] font-minecraft text-gray-500">
                  Your army: {soldiers} soldiers
                </div>
                <button
                  onClick={() => handleRaid(selectedTown)}
                  className="mt-2 w-full py-1.5 bg-red-900 hover:bg-red-700 border border-red-700 text-red-200 font-minecraft text-xs font-bold transition-colors"
                >
                  ⚔️ RAID THIS TOWN
                </button>
              </div>
            ) : (
              <div className="text-gray-500 font-minecraft text-xs italic">
                Click a town on the map to see details
              </div>
            )}

            <div className="mt-auto">
              <div className="text-gray-500 font-minecraft text-[10px] border-t border-gray-800 pt-2">
                {allTowns.length - 1} neighboring towns
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
