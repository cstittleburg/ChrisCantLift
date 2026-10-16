import { createContext, useContext } from 'react';

// Sync status is shown as a small line under each screen's title instead of a floating pill.
export const SyncStatusContext = createContext('idle');
export const useSyncStatus = () => useContext(SyncStatusContext);

const STATES = {
  syncing: { dot: 'bg-brass', text: 'Syncing…' },
  synced:  { dot: 'bg-teal', text: 'Synced' },
  offline: { dot: 'bg-orange', text: 'Offline — changes saved on this phone' },
};

// Renders nothing when idle unless `fallback` text is given (shown with no dot).
export default function SyncStatus({ fallback = null, className = '' }) {
  const status = useSyncStatus();
  const s = STATES[status];
  if (!s && !fallback) return null;
  return (
    <p className={`flex items-center gap-2 text-sm text-dust ${className}`} role="status">
      {s && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />}
      <span className="truncate">{s ? s.text : fallback}</span>
    </p>
  );
}
