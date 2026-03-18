import { useEffect, useState } from 'react';
import GameWrapper from './components/GameWrapper';
import { useGameStore } from './store/gameStore';
import {
  getOrCreatePlayerId,
  getOrCreatePlayerName,
  setPlayerName,
  loadGameState,
  getWorldTowns,
} from './services/worldService';
import { XP_PER_LEVEL } from './game/config';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [inputName, setInputName] = useState('');
  const [loading, setLoading] = useState(false);

  const { setPlayerId, setPlayerName: storeSetName, setInitialState, setWorldMap } = useGameStore(s => ({
    setPlayerId: s.setPlayerId,
    setPlayerName: s.setPlayerName,
    setInitialState: s.setInitialState,
    setWorldMap: s.setWorldMap,
  }));

  useEffect(() => {
    const existingId = localStorage.getItem('townforge_player_id');
    if (existingId) {
      // Auto-login returning player
      initGame(existingId);
    }
  }, []);

  const initGame = async (playerId: string) => {
    setLoading(true);
    const id = playerId || getOrCreatePlayerId();
    const name = getOrCreatePlayerName();

    setPlayerId(id);
    storeSetName(name);

    // Load saved state
    try {
      const saved = await loadGameState(id) as any;
      if (saved) {
        setInitialState({
          level: saved.level ?? 1,
          xp: saved.xp ?? 0,
          xpToNextLevel: XP_PER_LEVEL(saved.level ?? 1),
          resources: saved.resources ?? { gold: 100, food: 50, wood: 50, stone: 30 },
          population: saved.population ?? 0,
          soldiers: saved.soldiers ?? 0,
          buildings: saved.buildings ?? [],
          happiness: saved.happiness ?? 50,
          tick: saved.tick ?? 0,
        });
      }
    } catch (e) {
      console.warn('Could not load saved state:', e);
    }

    // Load world towns
    try {
      const towns = await getWorldTowns();
      setWorldMap(towns);
    } catch (e) {
      console.warn('Could not load world towns:', e);
    }

    setLoading(false);
    setAuthenticated(true);
  };

  const handleEnter = () => {
    const id = getOrCreatePlayerId();
    if (inputName.trim()) {
      setPlayerName(inputName.trim());
    }
    initGame(id);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⚒️</div>
          <p className="text-green-400 font-minecraft text-xl animate-pulse">Loading TownForge...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950 overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 47px, #2d5a27 47px, #2d5a27 48px),
              repeating-linear-gradient(90deg, transparent, transparent 47px, #2d5a27 47px, #2d5a27 48px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 text-center px-4 max-w-sm w-full">
          {/* Logo */}
          <div className="mb-6">
            <div className="text-6xl sm:text-8xl mb-2">🏰</div>
            <h1 className="text-4xl sm:text-5xl font-minecraft font-bold text-yellow-400 tracking-wider"
              style={{ textShadow: '3px 3px 0 #7a5000, 6px 6px 0 #3a2500' }}>
              TOWNFORGE
            </h1>
            <p className="text-green-400 font-minecraft text-sm mt-2 tracking-wide">
              Build. Grow. Conquer.
            </p>
          </div>

          {/* Features list */}
          <div className="bg-black/60 border-2 border-green-800 p-4 mb-6 text-left">
            {[
              '🏗️ Build a thriving city',
              '⚔️ Train soldiers & raid',
              '🌾 Manage food & resources',
              '🗺️ World map multiplayer',
              '📈 Level up to 50',
            ].map(f => (
              <div key={f} className="text-green-300 font-minecraft text-xs py-0.5">{f}</div>
            ))}
          </div>

          {/* Name input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter your name (optional)"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEnter()}
              maxLength={20}
              className="w-full bg-gray-900 border-2 border-yellow-700 text-yellow-200 font-minecraft text-sm px-3 py-2 focus:outline-none focus:border-yellow-400 placeholder-gray-600"
            />
          </div>

          {/* Enter button */}
          <button
            onClick={handleEnter}
            className="w-full py-3 bg-green-800 hover:bg-green-700 active:bg-green-900 border-2 border-green-500 text-green-100 font-minecraft text-lg font-bold tracking-widest transition-colors shadow-minecraft"
            style={{ textShadow: '2px 2px 0 #0a2a0a' }}
          >
            ENTER TOWNFORGE
          </button>

          <p className="mt-3 text-gray-600 font-minecraft text-[10px]">
            Works offline • No account required • Progress saved locally
          </p>
        </div>
      </div>
    );
  }

  return <GameWrapper />;
}
