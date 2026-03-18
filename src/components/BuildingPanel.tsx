import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { BUILDING_DEFINITIONS } from '../game/config';
import { BuildingType, TerrainTool } from '../types';

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

const TERRAIN_TOOLS: Array<{
  id: TerrainTool;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'raise',
    label: 'Raise Land',
    icon: '⬆',
    description: 'Lift a tile up one level to shape ridges, terraces, and towers.',
  },
  {
    id: 'lower',
    label: 'Lower Land',
    icon: '⬇',
    description: 'Carve the tile down to open courtyards, roads, and flat build pads.',
  },
];

export default function BuildingPanel() {
  const {
    selectedBuilding,
    selectedTerrainTool,
    setSelectedBuilding,
    setSelectedTerrainTool,
    clearSelection,
    resources,
  } = useGameStore();
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingType | null>(null);
  const [hoveredTerrainTool, setHoveredTerrainTool] = useState<TerrainTool | null>(null);

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
  const hoveredTool = hoveredTerrainTool
    ? TERRAIN_TOOLS.find(tool => tool.id === hoveredTerrainTool) ?? null
    : null;

  return (
    <div className="absolute right-0 top-8 bottom-0 z-10 flex flex-col w-36 sm:w-44 pointer-events-auto">
      {/* Header */}
      <div className="bg-gray-900/95 border-l-2 border-b-2 border-yellow-800 px-2 py-1">
        <span className="text-yellow-300 font-minecraft text-xs font-bold tracking-wider">BUILD TOOLS</span>
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
      {hoveredTool && (
        <div className="bg-black/95 border border-cyan-700 px-2 py-1 text-xs font-minecraft">
          <div className="text-cyan-200 font-bold">{hoveredTool.icon} {hoveredTool.label}</div>
          <div className="text-gray-300 mt-0.5 text-[10px] leading-tight">{hoveredTool.description}</div>
          <div className="text-cyan-400 text-[10px] mt-0.5">Freeform terrain sculpting</div>
        </div>
      )}

      {/* Building list */}
      <div className="flex-1 overflow-y-auto bg-gray-900/90 border-l-2 border-yellow-900 scrollbar-thin">
        <div className="border-b border-gray-800/80">
          <div className="px-2 py-1 text-[10px] text-cyan-300 font-minecraft tracking-widest bg-cyan-950/20">
            TERRAIN
          </div>
          {TERRAIN_TOOLS.map((tool) => {
            const isSelected = selectedTerrainTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTerrainTool(isSelected ? null : tool.id)}
                onMouseEnter={() => setHoveredTerrainTool(tool.id)}
                onMouseLeave={() => setHoveredTerrainTool(null)}
                className={`
                  w-full px-2 py-1.5 text-left border-b border-gray-800 transition-all
                  ${isSelected
                    ? 'bg-cyan-700/35 border-l-4 border-l-cyan-300'
                    : 'hover:bg-gray-700/60 border-l-4 border-l-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-cyan-200">{tool.icon}</span>
                  <span className={`font-minecraft text-xs font-bold ${isSelected ? 'text-cyan-100' : 'text-gray-200'}`}>
                    {tool.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-2 py-1 text-[10px] text-yellow-300 font-minecraft tracking-widest bg-yellow-950/20 border-b border-gray-800/80">
          STRUCTURES
        </div>
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
      {(selectedBuilding || selectedTerrainTool) && (
        <button
          onClick={clearSelection}
          className="bg-red-900/90 hover:bg-red-800 border-t-2 border-l-2 border-red-700 py-1.5 font-minecraft text-xs text-red-200 font-bold tracking-wide transition-colors"
        >
          ✕ CANCEL
        </button>
      )}

      {/* Help text */}
      <div className="bg-black/80 border-l-2 border-t border-gray-800 px-2 py-1">
        <p className="text-gray-500 text-[9px] font-minecraft leading-tight">
          Click: Build or sculpt<br />
          Right click: Remove build<br />
          Scroll: Zoom<br />
          WASD: Pan the camera
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
