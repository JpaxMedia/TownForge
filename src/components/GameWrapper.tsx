import { useState } from 'react';
import PhaserGame from '../game/PhaserGame';
import HUD from './HUD';
import BuildingPanel from './BuildingPanel';
import EventLog from './EventLog';
import MilitaryPanel from './MilitaryPanel';
import WorldMap from './WorldMap';
import NotificationToast from './NotificationToast';

export default function GameWrapper() {
  const [showMilitary, setShowMilitary] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden bg-minecraft-sky">
      {/* Phaser canvas layer */}
      <PhaserGame />

      {/* HUD overlay */}
      <HUD />

      {/* Building panel */}
      <BuildingPanel />

      {/* Event log */}
      <EventLog />

      {/* Notification toasts */}
      <NotificationToast />

      {/* Toggle buttons (bottom right above event log) */}
      <div className="absolute bottom-32 right-36 sm:right-44 z-10 flex flex-col gap-1 pointer-events-auto">
        <button
          onClick={() => { setShowMilitary(!showMilitary); setShowWorldMap(false); }}
          className={`
            px-2 py-1 font-minecraft text-xs font-bold border-2 transition-all shadow-minecraft
            ${showMilitary
              ? 'bg-red-700 border-red-500 text-white'
              : 'bg-red-950/90 border-red-800 text-red-300 hover:bg-red-900'
            }
          `}
        >
          ⚔️ Military
        </button>
        <button
          onClick={() => { setShowWorldMap(!showWorldMap); setShowMilitary(false); }}
          className={`
            px-2 py-1 font-minecraft text-xs font-bold border-2 transition-all shadow-minecraft
            ${showWorldMap
              ? 'bg-green-700 border-green-500 text-white'
              : 'bg-green-950/90 border-green-800 text-green-300 hover:bg-green-900'
            }
          `}
        >
          🗺️ World
        </button>
      </div>

      {/* Modals */}
      {showMilitary && <MilitaryPanel onClose={() => setShowMilitary(false)} />}
      {showWorldMap && <WorldMap onClose={() => setShowWorldMap(false)} />}
    </div>
  );
}
