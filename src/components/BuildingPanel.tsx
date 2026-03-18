import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { BUILDING_DEFINITIONS } from '../game/config';
import { BuildingType } from '../types';

const BUILDING_ORDER: BuildingType[] = [
  BuildingType.HOUSE,
  BuildingType.FARM,
  BuildingType.MARKET,
  BuildingType.LUMBER_MILL,
  BuildingType.QUARRY,
  BuildingType.BARRACKS,
  BuildingType.WALL,
  BuildingType.WATCH_TOWER,
  BuildingType.TEMPLE,
];

export default function BuildingPanel() {
  const { selectedBuilding, setSelectedBuilding, resources } = useGameStore();
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingType | null>(null);

  const canAfford = (type: BuildingType) => {
    const cost = BUILDING_DEFINITIONS[type].cost;
    return (
      (cost.gold ?? 0) <= resources.gold &&
      (cost.food ?? 0) <= resources.food &&
      (cost.wood ?? 0) <= resources.wood &&
      (cost.stone ?? 0) <= resources.stone
    );
  };

  const handleSelect = (type: BuildingType) => {
    if (selectedBuilding === type) {
      setSelectedBuilding(null);
    } else {
      setSelectedBuilding(type);
    }
  };

  const hovered = hoveredBuilding ? BUILDING_DEFINITIONS[hoveredBuilding] : null;

  return (
    <div className="absolute right-0 top-8 bottom-0 z-10 flex flex-col w-36 sm:w-44 pointer-events-auto">
      {/* Header */}
      <div className="bg-gray-900/95 border-l-2 border-b-2 border-yellow-800 px-2 py-1">
        <span className="text-yellow-300 font-minecraft text-xs font-bold tracking-wider">BUILDINGS</span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="bg-black/95 border border-yellow-700 px-2 py-1 text-xs font-minecraft">
          <div className="text-yellow-200 font-bold">{hovered.emoji} {hovered.name}</div>
          <div className="text-gray-300 mt-0.5 text-[10px] leading-tight">{hovered.description}</div>
          {hovered.effect.populationCap && (
            <div className="text-green-400 text-[10px]">+{hovered.effect.populationCap} pop cap</div>
          )}
          {hovered.effect.happiness && (
            <div className="text-pink-400 text-[10px]">+{hovered.effect.happiness} happiness</div>
          )}
          {hovered.effect.defense && (
            <div className="text-blue-400 text-[10px]">+{hovered.effect.defense} defense</div>
          )}
          {Object.entries(hovered.produces).filter(([,v]) => v && v > 0).map(([k, v]) => (
            <div key={k} className="text-cyan-400 text-[10px]">+{v} {k}/tick</div>
          ))}
        </div>
      )}

      {/* Building list */}
      <div className="flex-1 overflow-y-auto bg-gray-900/90 border-l-2 border-yellow-900 scrollbar-thin">
        {BUILDING_ORDER.map((type) => {
          const def = BUILDING_DEFINITIONS[type];
          const affordable = canAfford(type);
          const isSelected = selectedBuilding === type;

          return (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              onMouseEnter={() => setHoveredBuilding(type)}
              onMouseLeave={() => setHoveredBuilding(null)}
              className={`
                w-full px-2 py-1.5 text-left border-b border-gray-800 transition-all
                ${isSelected
                  ? 'bg-yellow-700/60 border-l-4 border-l-yellow-400'
                  : affordable
                    ? 'hover:bg-gray-700/60 border-l-4 border-l-transparent'
                    : 'opacity-50 cursor-not-allowed border-l-4 border-l-transparent'
                }
              `}
              disabled={!affordable && !isSelected}
            >
              <div className="flex items-center gap-1">
                <span className="text-base">{def.emoji}</span>
                <span className={`font-minecraft text-xs font-bold ${isSelected ? 'text-yellow-200' : 'text-gray-200'}`}>
                  {def.name}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {def.cost.gold ? <CostBadge icon="🪙" val={def.cost.gold} have={resources.gold} /> : null}
                {def.cost.food ? <CostBadge icon="🌾" val={def.cost.food} have={resources.food} /> : null}
                {def.cost.wood ? <CostBadge icon="🪵" val={def.cost.wood} have={resources.wood} /> : null}
                {def.cost.stone ? <CostBadge icon="🪨" val={def.cost.stone} have={resources.stone} /> : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Cancel button */}
      {selectedBuilding && (
        <button
          onClick={() => setSelectedBuilding(null)}
          className="bg-red-900/90 hover:bg-red-800 border-t-2 border-l-2 border-red-700 py-1.5 font-minecraft text-xs text-red-200 font-bold tracking-wide transition-colors"
        >
          ✕ CANCEL
        </button>
      )}

      {/* Help text */}
      <div className="bg-black/80 border-l-2 border-t border-gray-800 px-2 py-1">
        <p className="text-gray-500 text-[9px] font-minecraft leading-tight">
          Left click: Place<br />
          Right click: Remove<br />
          Scroll: Zoom<br />
          WASD: Pan
        </p>
      </div>
    </div>
  );
}

function CostBadge({ icon, val, have }: { icon: string; val: number; have: number }) {
  const enough = have >= val;
  return (
    <span className={`text-[9px] font-minecraft ${enough ? 'text-gray-300' : 'text-red-400'}`}>
      {icon}{val}
    </span>
  );
}
