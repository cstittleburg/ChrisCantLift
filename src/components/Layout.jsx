import { Dumbbell, History, Utensils, TrendingUp } from 'lucide-react';
import { SyncStatusContext } from './ui/SyncStatus';

const TABS = [
  { id: 'today', label: 'Today', Icon: Dumbbell },
  { id: 'history', label: 'History', Icon: History },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils },
  { id: 'progress', label: 'Progress', Icon: TrendingUp },
];

// Sync status is handed to screens through context; each shows it under its title.
export default function Layout({ children, activeTab, onTabChange, syncStatus }) {
  return (
    <SyncStatusContext.Provider value={syncStatus}>
      <div className="flex flex-col h-screen bg-floor text-chalk font-sans">
        <main className="flex-1 overflow-y-auto pb-28">
          {children}
        </main>
        <nav className="fixed bottom-0 left-0 right-0 bg-floor border-t border-plate grid grid-cols-4 gap-1 px-2 pt-1.5 pb-7 z-50">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`h-14 flex flex-col items-center justify-center gap-0.5 rounded-tile ${
                  active ? 'bg-orange-deep text-orange font-bold' : 'text-ash active:text-dust'
                }`}
              >
                <Icon size={22} />
                <span className="text-xs">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </SyncStatusContext.Provider>
  );
}
