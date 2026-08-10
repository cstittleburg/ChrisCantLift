import { useMemo, useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { computeAll1RMs, epley1RM } from '../../utils/prDetection';
import { getAllExercisesMap } from '../../utils/exerciseRegistry';
import { getWorkoutSessions } from '../../utils/storage';

// Rep ranges to show in the rep-max table
const REP_COLS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

export default function OneRepMaxScreen({ onClose }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const nameMap = useMemo(() => getAllExercisesMap(), []);

  const entries = useMemo(() => computeAll1RMs(nameMap), [nameMap]);

  const filtered = entries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">1-Rep Max Estimates</h2>
          <button onClick={() => setShowInfo(!showInfo)} className="text-gray-600">
            <Info size={16} />
          </button>
        </div>
        <button onClick={onClose} className="text-gray-500 p-1"><X size={22} /></button>
      </div>

      {showInfo && (
        <div className="mx-4 mt-3 bg-gray-800 rounded-xl px-4 py-3 text-xs text-gray-400 leading-relaxed border border-gray-700">
          <p className="font-semibold text-gray-300 mb-1">How this is calculated</p>
          <p>Uses the <span className="text-white">Epley formula</span>: <span className="font-mono text-blue-300">1RM = weight × (1 + reps ÷ 30)</span></p>
          <p className="mt-1">Each row shows your best estimated 1RM based on the heaviest set ever logged at each rep count. The full table projects how much you could lift for any rep count based on your best set.</p>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="font-semibold">No data yet</p>
            <p className="text-sm mt-1">Log weighted sets to see estimates</p>
          </div>
        )}

        {filtered.map(entry => {
          const isExpanded = expanded === entry.exerciseId;
          return (
            <div key={entry.exerciseId} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : entry.exerciseId)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{entry.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Best set: {entry.weight} lbs × {entry.reps} rep{entry.reps !== 1 ? 's' : ''} · {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xl font-black text-yellow-400">{entry.e1rm}</p>
                    <p className="text-xs text-gray-500">est. 1RM</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={16} className="text-gray-500" />
                    : <ChevronDown size={16} className="text-gray-500" />
                  }
                </div>
              </button>

              {isExpanded && (
                <RepMaxTable exerciseId={entry.exerciseId} e1rm={entry.e1rm} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Shows a table of estimated max weight for 1–15 reps,
 * derived from the exercise's best e1RM.
 * Also highlights which rep counts the user has actual logged PRs for.
 */
function RepMaxTable({ exerciseId, e1rm }) {
  // Gather actual logged PRs for this exercise (best weight per rep count)
  const actualPRs = useMemo(() => {
    const sessions = getWorkoutSessions();
    const map = {};
    sessions.forEach(session => {
      (session.sets?.[exerciseId] || []).forEach(s => {
        if (!s.weight || !s.reps) return;
        if (!map[s.reps] || s.weight > map[s.reps]) map[s.reps] = s.weight;
      });
    });
    return map;
  }, [exerciseId]);

  // Derive estimated weight for N reps from e1RM: weight = e1RM / (1 + reps/30)
  const estimate = (reps) => {
    if (reps === 1) return e1rm;
    return Math.round(e1rm / (1 + reps / 30));
  };

  return (
    <div className="border-t border-gray-800 px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rep Max Table</p>
      <div className="grid grid-cols-5 gap-1.5">
        {REP_COLS.map(reps => {
          const est = estimate(reps);
          const actual = actualPRs[reps];
          const hasActual = actual !== undefined;
          return (
            <div
              key={reps}
              className={`rounded-xl p-2 text-center ${hasActual ? 'bg-yellow-900/30 border border-yellow-700/40' : 'bg-gray-800'}`}
            >
              <p className="text-xs text-gray-500 font-semibold">{reps}RM</p>
              <p className={`text-sm font-bold mt-0.5 ${hasActual ? 'text-yellow-300' : 'text-gray-300'}`}>
                {est}
              </p>
              {hasActual && (
                <p className="text-xs text-yellow-600 leading-tight">
                  actual: {actual}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-700 mt-2 text-center">
        Gold = you have actual logged data at that rep count
      </p>
    </div>
  );
}
