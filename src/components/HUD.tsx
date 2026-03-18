import { useGameStore } from '../store/gameStore';

export default function HUD() {
  const {
    level, xp, xpToNextLevel, playerName,
    resources, population, populationCap,
    happiness, soldiers,
  } = useGameStore();

  const xpPercent = Math.floor((xp / xpToNextLevel) * 100);
  const happinessColor = happiness > 70 ? 'text-green-400' : happiness > 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none select-none">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-2 py-1 bg-black/80 border-b-2 border-yellow-700">
        {/* Level badge */}
        <div className="flex items-center gap-1 bg-yellow-700 border-2 border-yellow-500 px-2 py-0.5 min-w-[60px]">
          <span className="text-yellow-200 font-minecraft text-xs font-bold">LVL</span>
          <span className="text-yellow-100 font-minecraft text-sm font-bold">{level}</span>
        </div>

        {/* XP Bar */}
        <div className="flex items-center gap-1 flex-1 max-w-[180px]">
          <span className="text-purple-300 font-minecraft text-xs hidden sm:inline">XP</span>
          <div className="flex-1 bg-gray-800 border border-purple-600 h-4 relative min-w-[60px]">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${xpPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-minecraft leading-none">
              {xp}/{xpToNextLevel}
            </span>
          </div>
        </div>

        {/* Player Name */}
        <div className="text-yellow-200 font-minecraft text-xs hidden md:block truncate max-w-[120px]">
          {playerName}
        </div>

        <div className="flex-1" />

        {/* Resources */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <ResourcePill emoji="🪙" value={resources.gold} color="text-yellow-300" />
          <ResourcePill emoji="🌾" value={resources.food} color="text-green-300" />
          <ResourcePill emoji="🪵" value={resources.wood} color="text-amber-400" />
          <ResourcePill emoji="🪨" value={resources.stone} color="text-gray-300" />
          <div className="h-4 w-px bg-gray-600 hidden sm:block" />
          <div className="flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 border border-green-700">
            <span className="text-xs">👥</span>
            <span className="text-green-300 font-minecraft text-xs">{population}<span className="text-gray-400">/{populationCap}</span></span>
          </div>
          <div className={`flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 border border-pink-700 ${happinessColor}`}>
            <span className="text-xs">😊</span>
            <span className="font-minecraft text-xs">{happiness}%</span>
          </div>
          <div className="flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 border border-red-800">
            <span className="text-xs">⚔️</span>
            <span className="text-red-300 font-minecraft text-xs">{soldiers}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourcePill({ emoji, value, color }: { emoji: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 border border-gray-700 ${color}`}>
      <span className="text-xs">{emoji}</span>
      <span className="font-minecraft text-xs font-bold">{value}</span>
    </div>
  );
}
