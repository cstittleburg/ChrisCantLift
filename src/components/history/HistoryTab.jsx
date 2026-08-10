import { useState, useMemo } from 'react';
import { getWorkoutSessions } from '../../utils/storage';
import { WORKOUT_PROGRAM } from '../../data/workoutProgram';
import { getAllExercisesMap } from '../../utils/exerciseRegistry';
import { ChevronDown, ChevronUp, Search, TrendingUp, AlertTriangle, Award, Dumbbell } from 'lucide-react';

const VIEWS = ['Log', 'Exercises', 'Records', 'Trends'];

export default function HistoryTab() {
  const [view, setView] = useState('Log');
  const sessions = useMemo(() => {
    const s = getWorkoutSessions();
    return [...s].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, []);

  return (
    <div className="pb-6">
      <div className="sticky top-0 bg-gray-950 z-10 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-white mb-3">History</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                view === v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {view === 'Log' && <WorkoutLog sessions={sessions} />}
        {view === 'Exercises' && <ExerciseHistory sessions={sessions} />}
        {view === 'Records' && <PersonalRecords sessions={sessions} />}
        {view === 'Trends' && <TrendsView sessions={sessions} />}
      </div>
    </div>
  );
}

// ─── Workout Log ────────────────────────────────────────────────────────────

function WorkoutLog({ sessions }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No workouts yet</p>
        <p className="text-sm mt-1">Complete your first session to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const workout = WORKOUT_PROGRAM[session.workoutId];
  const date = new Date(session.startTime);
  const duration = session.endTime
    ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)
    : null;

  const totalSets = Object.values(session.sets || {}).reduce((sum, sets) => sum + sets.length, 0);

  const statusColor = {
    completed: 'text-green-400 bg-green-900/30 border-green-800/50',
    incomplete: 'text-yellow-400 bg-yellow-900/30 border-yellow-800/50',
    active: 'text-blue-400 bg-blue-900/30 border-blue-800/50',
  }[session.status] || 'text-gray-400 bg-gray-800 border-gray-700';

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor}`}>
                {session.status}
              </span>
              {session.skipData?.lowerBackPain && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/40 border border-red-800/50 text-red-400">
                  ⚠ Lower Back
                </span>
              )}
            </div>
            <h3 className="font-bold text-white">{session.workoutName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {duration && ` · ${duration}min`}
              {totalSets > 0 && ` · ${totalSets} sets`}
            </p>
          </div>
          {expanded ? <ChevronUp size={18} className="text-gray-500 mt-1" /> : <ChevronDown size={18} className="text-gray-500 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
          {/* Sets logged */}
          {Object.entries(session.sets || {}).map(([exerciseId, sets]) => {
            if (!sets || sets.length === 0) return null;
            const exerciseName = getAllExercisesMap()[exerciseId] || exerciseId;

            return (
              <div key={exerciseId}>
                <p className="text-xs font-semibold text-gray-400 mb-1">{exerciseName}</p>
                <div className="flex flex-wrap gap-2">
                  {sets.map((s, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-white font-semibold">{s.reps} × {s.weight ? `${s.weight}lbs` : 'BW'}</span>
                      {s.rir !== undefined && <span className="text-gray-500 ml-1">RIR{s.rir}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Skip data */}
          {session.skipData && (
            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-400 mb-1">Ended Early</p>
              <p className="text-xs text-gray-400">
                Reasons: {session.skipData.reasons?.join(', ')}
              </p>
              {session.skipData.note && (
                <p className="text-xs text-gray-500 mt-1 italic">"{session.skipData.note}"</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exercise History ────────────────────────────────────────────────────────

function ExerciseHistory({ sessions }) {
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Build a map of exerciseId -> { name, history: [{date, sets}] }
  const exerciseMap = useMemo(() => {
    const map = {};
    [...sessions].reverse().forEach(session => {
      const workout = WORKOUT_PROGRAM[session.workoutId];
      Object.entries(session.sets || {}).forEach(([exerciseId, sets]) => {
        if (!sets || sets.length === 0) return;

        const exerciseName = getAllExercisesMap()[exerciseId] || exerciseId;

        if (!map[exerciseId]) {
          map[exerciseId] = { name: exerciseName, history: [] };
        }
        map[exerciseId].history.push({
          date: session.startTime,
          sets,
        });
      });
    });
    return map;
  }, [sessions]);

  const filtered = Object.entries(exerciseMap).filter(([, v]) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedExercise) {
    const data = exerciseMap[selectedExercise];
    return <ExerciseDetail exerciseId={selectedExercise} data={data} onBack={() => setSelectedExercise(null)} />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 text-white rounded-xl pl-9 pr-4 py-3 text-sm"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-8">No exercises logged yet</p>
      )}

      {filtered.map(([id, data]) => {
        const last = data.history[data.history.length - 1];
        const lastSet = last?.sets?.reduce((best, s) => (!best || s.weight > best.weight) ? s : best, null);
        return (
          <button
            key={id}
            onClick={() => setSelectedExercise(id)}
            className="w-full bg-gray-900 rounded-xl border border-gray-800 p-4 text-left flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-white text-sm">{data.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {data.history.length} session{data.history.length !== 1 ? 's' : ''}
                {lastSet?.weight && ` · Last: ${lastSet.weight}lbs`}
              </p>
            </div>
            <ChevronDown size={16} className="text-gray-600 rotate-[-90deg]" />
          </button>
        );
      })}
    </div>
  );
}

function ExerciseDetail({ exerciseId, data, onBack }) {
  // Find best set per session for a simple sparkline
  const sessions = data.history.map(h => ({
    date: new Date(h.date),
    maxWeight: Math.max(...h.sets.map(s => s.weight || 0)),
    totalVolume: h.sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0),
    sets: h.sets,
  }));

  const allTimePR = Math.max(...sessions.map(s => s.maxWeight));

  return (
    <div>
      <button onClick={onBack} className="text-blue-400 text-sm font-semibold mb-4 flex items-center gap-1">
        ← Back
      </button>
      <h2 className="text-xl font-bold text-white mb-1">{data.name}</h2>
      {allTimePR > 0 && (
        <p className="text-sm text-yellow-400 font-semibold mb-4">🏆 PR: {allTimePR}lbs</p>
      )}

      <div className="space-y-3">
        {[...sessions].reverse().map((s, i) => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">
                {s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {s.maxWeight === allTimePR && allTimePR > 0 && (
                <span className="text-xs text-yellow-400 font-bold">PR 🏆</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {s.sets.map((set, j) => (
                <div key={j} className="bg-gray-800 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-white font-semibold">{set.reps} × {set.weight ? `${set.weight}lbs` : 'BW'}</span>
                  {set.rir !== undefined && <span className="text-gray-500 ml-1">RIR{set.rir}</span>}
                </div>
              ))}
            </div>
            {s.totalVolume > 0 && (
              <p className="text-xs text-gray-600 mt-2">Volume: {s.totalVolume.toLocaleString()}lbs</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Personal Records ────────────────────────────────────────────────────────

function PersonalRecords({ sessions }) {
  const records = useMemo(() => {
    const map = {};
    sessions.forEach(session => {
      const workout = WORKOUT_PROGRAM[session.workoutId];
      Object.entries(session.sets || {}).forEach(([exerciseId, sets]) => {
        if (!sets || sets.length === 0) return;
        const exerciseName = getAllExercisesMap()[exerciseId] || exerciseId;

        sets.forEach(s => {
          if (!s.weight) return;
          if (!map[exerciseId] || s.weight > map[exerciseId].weight) {
            map[exerciseId] = {
              name: exerciseName,
              weight: s.weight,
              reps: s.reps,
              date: session.startTime,
            };
          }
        });
      });
    });
    return Object.values(map).sort((a, b) => b.weight - a.weight);
  }, [sessions]);

  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <Award size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No records yet</p>
        <p className="text-sm mt-1">Log weighted sets to track PRs</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((r, i) => (
        <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-3">
          <span className="text-2xl font-black text-gray-700 w-8 text-center">{i + 1}</span>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">{r.name}</p>
            <p className="text-xs text-gray-500">
              {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-yellow-400">{r.weight}lbs</p>
            <p className="text-xs text-gray-500">{r.reps} reps</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Trends ─────────────────────────────────────────────────────────────────

function TrendsView({ sessions }) {
  const incompleteSessions = sessions.filter(s => s.status === 'incomplete' && s.skipData);

  // Lower back pain instances
  const lowerBackInstances = incompleteSessions.filter(s => s.skipData?.lowerBackPain);

  // Obstacle breakdown
  const reasonCounts = {};
  incompleteSessions.forEach(s => {
    (s.skipData?.reasons || []).forEach(r => {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });
  });

  const totalIncomplete = incompleteSessions.length;
  const totalSessions = sessions.length;

  const reasonColors = {
    time: 'bg-blue-500',
    energy: 'bg-yellow-500',
    pain: 'bg-red-500',
    combination: 'bg-purple-500',
  };

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Sessions" value={totalSessions} />
        <StatCard label="Completed" value={sessions.filter(s => s.status === 'completed').length} color="text-green-400" />
        <StatCard label="Ended Early" value={totalIncomplete} color="text-yellow-400" />
      </div>

      {/* Lower back pain trend */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400" />
          <h3 className="font-bold text-sm text-white">Lower Back Pain Log</h3>
        </div>
        {lowerBackInstances.length === 0 ? (
          <p className="text-xs text-gray-600">No lower back pain events logged 🎉</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-400 font-semibold">{lowerBackInstances.length} event{lowerBackInstances.length !== 1 ? 's' : ''}</p>
            {lowerBackInstances.map((s, i) => (
              <div key={i} className="bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-red-300">
                  {new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-400">{s.workoutName}</p>
                {s.skipData?.note && (
                  <p className="text-xs text-gray-500 italic mt-0.5">"{s.skipData.note}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Obstacle breakdown */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-blue-400" />
          <h3 className="font-bold text-sm text-white">Skip Reasons</h3>
        </div>
        {totalIncomplete === 0 ? (
          <p className="text-xs text-gray-600">No skipped workouts yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(reasonCounts).map(([reason, count]) => {
              const pct = Math.round((count / totalIncomplete) * 100);
              return (
                <div key={reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-300 capitalize">{reason}</span>
                    <span className="text-xs text-gray-500">{count}×</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${reasonColors[reason] || 'bg-gray-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent incomplete workouts with notes */}
      {incompleteSessions.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="font-bold text-sm text-white mb-3">Recent Early Endings</h3>
          <div className="space-y-2">
            {incompleteSessions.slice(0, 5).map((s, i) => (
              <div key={i} className="border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-300">{s.workoutName}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-xs text-gray-500 capitalize">{s.skipData?.reasons?.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
