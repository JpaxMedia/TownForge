import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { Severity } from '../types';

const severityColors: Record<Severity, string> = {
  info: 'text-blue-300 border-blue-800',
  warning: 'text-yellow-300 border-yellow-800',
  danger: 'text-red-300 border-red-900',
  success: 'text-green-300 border-green-900',
};

const severityBg: Record<Severity, string> = {
  info: 'bg-blue-900/20',
  warning: 'bg-yellow-900/20',
  danger: 'bg-red-900/20',
  success: 'bg-green-900/20',
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function EventLog() {
  const { events } = useGameStore();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [events]);

  return (
    <div className="absolute bottom-0 left-0 right-36 sm:right-44 z-10 pointer-events-auto">
      <div className="bg-black/85 border-t-2 border-gray-700 max-h-32 overflow-hidden">
        {/* Header */}
        <div className="px-2 py-0.5 bg-gray-900/80 border-b border-gray-700">
          <span className="text-gray-400 font-minecraft text-[10px] tracking-widest">EVENT LOG</span>
        </div>

        {/* Log entries */}
        <div
          ref={logRef}
          className="overflow-y-auto max-h-24 flex flex-col-reverse"
        >
          {events.length === 0 ? (
            <div className="px-2 py-1 text-gray-600 font-minecraft text-xs italic">
              No events yet...
            </div>
          ) : (
            events.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className={`
                  flex items-start gap-2 px-2 py-0.5 border-b
                  ${severityColors[event.severity]} ${severityBg[event.severity]}
                `}
              >
                <span className="text-gray-500 font-minecraft text-[9px] shrink-0 mt-0.5">
                  {formatTime(event.timestamp)}
                </span>
                <span className="font-minecraft text-xs leading-tight">{event.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
