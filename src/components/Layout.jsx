import { Dumbbell, History, Apple, TrendingUp } from 'lucide-react';

const TABS = [
  { id: 'today', label: 'Today', Icon: Dumbbell },
  { id: 'history', label: 'History', Icon: History },
  { id: 'nutrition', label: 'Nutrition', Icon: Apple },
  { id: 'progress', label: 'Progress', Icon: TrendingUp },
];

export default function Layout({ children, activeTab, onTabChange, syncStatus }) {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {syncStatus === 'syncing' && (
        <div className="fixed top-2 right-2 z-50 bg-gray-800 text-gray-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Syncing...
        </div>
      )}
      {syncStatus === 'synced' && (
        <div className="fixed top-2 right-2 z-50 bg-gray-800 text-green-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Synced
        </div>
      )}
      {syncStatus === 'offline' && (
        <div className="fixed top-2 right-2 z-50 bg-gray-800 text-orange-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Offline
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              activeTab === id
                ? 'text-blue-400'
                : 'text-gray-500 active:text-gray-300'
            }`}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
