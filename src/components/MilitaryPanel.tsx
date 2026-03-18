import { useGameStore } from '../store/gameStore';
import { processRaid } from '../services/gameEngine';
import { BuildingType, GameEvent } from '../types';

interface MilitaryPanelProps {
  onClose: () => void;
}

let raidEventId = 0;

export default function MilitaryPanel({ onClose }: MilitaryPanelProps) {
  const soldiers = useGameStore(s => s.soldiers);
  const worldMap = useGameStore(s => s.worldMap);
  const resources = useGameStore(s => s.resources);
  const buildings = useGameStore(s => s.buildings);
  const addEvent = useGameStore(s => s.addEvent);
  const addNotification = useGameStore(s => s.addNotification);
  const addXP = useGameStore(s => s.addXP);
  const trainSoldier = useGameStore(s => s.trainSoldier);

  const handleTrain = () => {
    trainSoldier();
  };

  const handleRaid = (targetId: string) => {
    const store = useGameStore.getState();
    const target = store.worldMap.find(t => t.id === targetId);
    if (!target) return;
    if (store.soldiers === 0) {
      addNotification('You need soldiers to raid!', 'warning');
      return;
    }

    const result = processRaid(store.soldiers, target.soldiers, target.level);
    const event: GameEvent = {
      id: `raid_evt_${++raidEventId}`,
      type: 'raid_result',
      message: result.message,
      severity: result.success ? 'success' : 'warning',
      timestamp: Date.now(),
    };

    addEvent(event);
    addNotification(result.message, result.success ? 'success' : 'danger');

    useGameStore.setState(s => ({
      soldiers: Math.max(0, s.soldiers - result.soldierLost),
      resources: {
        ...s.resources,
        gold: s.resources.gold + result.goldGained,
      },
    }));

    addXP(result.xpGained);
  };

  const hasBarracks = buildings.some(b => b.type === BuildingType.BARRACKS);
  const canTrain = hasBarracks && resources.food >= 10 && resources.gold >= 5;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-72 sm:w-80 pointer-events-auto">
      <div className="bg-gray-950 border-3 border-red-800 shadow-minecraft">
        {/* Header */}
        <div className="flex items-center justify-between bg-red-950/80 border-b-2 border-red-800 px-3 py-2">
          <span className="text-red-300 font-minecraft font-bold text-sm">MILITARY</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white font-minecraft text-lg leading-none"
          >
            X
          </button>
        </div>

        {/* Soldiers */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-red-300 font-minecraft text-xs">SOLDIERS: </span>
              <span className="text-white font-minecraft text-sm font-bold">{soldiers}</span>
            </div>
            <button
              onClick={handleTrain}
              disabled={!canTrain}
              className={`
                px-3 py-1 font-minecraft text-xs font-bold border-2 transition-colors
                ${canTrain
                  ? 'bg-red-800 hover:bg-red-700 border-red-600 text-red-100'
                  : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              TRAIN (+1)
            </button>
          </div>
          <div className="mt-1 text-gray-500 font-minecraft text-[10px]">
            {hasBarracks
              ? 'Cost: Food x10 + Gold x5'
              : 'Build a Barracks first!'
            }
          </div>
        </div>

        {/* World Towns */}
        <div className="px-3 py-2">
          <div className="text-gray-400 font-minecraft text-[10px] mb-1 tracking-widest">NEIGHBORING TOWNS</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {worldMap.length === 0 ? (
              <div className="text-gray-600 font-minecraft text-xs italic">No towns discovered...</div>
            ) : (
              worldMap.map(town => (
                <div
                  key={town.id}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 px-2 py-1.5"
                >
                  <div>
                    <div className="text-yellow-200 font-minecraft text-xs font-bold">{town.name}</div>
                    <div className="text-gray-400 font-minecraft text-[9px]">
                      Lvl {town.level} | Pop {town.population} | Soldiers {town.soldiers}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRaid(town.id)}
                    className="px-2 py-0.5 bg-red-900 hover:bg-red-700 border border-red-700 text-red-200 font-minecraft text-[10px] transition-colors"
                  >
                    RAID
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
