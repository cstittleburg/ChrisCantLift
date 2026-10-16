import { useState, useMemo } from 'react';
import { getWorkoutSessions } from '../../utils/storage';
import { WORKOUT_PROGRAM } from '../../data/workoutProgram';
import { getAllExercisesMap } from '../../utils/exerciseRegistry';
import { ChevronDown, ChevronUp, Search, TrendingUp, AlertTriangle, Award, Dumbbell } from 'lucide-react';
import SegmentedControl from '../ui/SegmentedControl';
import SyncStatus from '../ui/SyncStatus';

const VIEWS = ['Log', 'Exercises', 'Records', 'Trends'];

export default function HistoryTab() {
  const [view, setView] = useState('Log');
  const sessions = useMemo(() => {
    const s = getWorkoutSessions();
    return [...s].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, []);

  return (
    <div className="pb-6">
      <div className="sticky top-0 bg-floor z-10 px-4 pt-6 pb-3">
        <h1 className="font-display font-extrabold uppercase text-[40px] leading-none">History</h1>
        <SyncStatus className="mt-1" />
        <div className="mt-3">
          <SegmentedControl options={VIEWS.map(v => [v, v])} value={view} onChange={setView} />
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
      <div className="text-center py-16 text-ash">
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
    completed: 'text-teal bg-plate border-teal/40',
    incomplete: 'text-brass bg-brass-deep border-brass-edge',
    active: 'text-orange bg-orange-deep border-orange/40',
  }[session.status] || 'text-dust bg-plate border-seam';

  return (
    <div className="bg-bench rounded-card border border-seam overflow-hidden">
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
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-deep border border-orange/40 text-orange">
                  ⚠ Lower Back
                </span>
              )}
            </div>
            <h3 className="font-bold text-chalk">{session.workoutName}</h3>
            <p className="text-xs text-dust mt-0.5">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {duration && ` · ${duration}min`}
              {totalSets > 0 && ` · ${totalSets} sets`}
            </p>
          </div>
          {expanded ? <ChevronUp size={18} className="text-dust mt-1" /> : <ChevronDown size={18} className="text-dust mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-seam pt-3 space-y-3">
          {/* Sets logged */}
          {Object.entries(session.sets || {}).map(([exerciseId, sets]) => {
            if (!sets || sets.length === 0) return null;
            const exerciseName = getAllExercisesMap()[exerciseId] || exerciseId;

            return (
              <div key={exerciseId}>
                <p className="text-xs font-semibold text-dust mb-1">{exerciseName}</p>
                <div className="flex flex-wrap gap-2">
                  {sets.map((s, i) => (
                    <div key={i} className="bg-plate rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-chalk font-semibold">{s.reps} × {s.weight ? `${s.weight}lbs` : 'BW'}</span>
                      {s.rir !== undefined && <span className="text-dust ml-1">RIR{s.rir}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Skip data */}
          {session.skipData && (
            <div className="bg-brass-deep border border-brass-edge rounded-xl p-3">
              <p className="text-xs font-semibold text-brass mb-1">Ended Early</p>
              <p className="text-xs text-dust">
                Reasons: {session.skipData.reasons?.join(', ')}
              </p>
              {session.skipData.note && (
                <p className="text-xs text-dust mt-1 italic">"{session.skipData.note}"</p>
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
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
        <input
          type="text"
          placeholder="Search exercises..."
          aria-label="Search exercises"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-14 bg-floor border border-seam rounded-input pl-10 pr-4 text-chalk placeholder-ash"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-ash text-sm text-center py-8">No exercises logged yet</p>
      )}

      {filtered.map(([id, data]) => {
        const last = data.history[data.history.length - 1];
        const lastSet = last?.sets?.reduce((best, s) => (!best || s.weight > best.weight) ? s : best, null);
        return (
          <button
            key={id}
            onClick={() => setSelectedExercise(id)}
            className="w-full bg-bench rounded-xl border border-seam p-4 text-left flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-chalk text-sm">{data.name}</p>
              <p className="text-xs text-dust mt-0.5">
                {data.history.length} session{data.history.length !== 1 ? 's' : ''}
                {lastSet?.weight && ` · Last: ${lastSet.weight}lbs`}
              </p>
            </div>
            <ChevronDown size={16} className="text-ash rotate-[-90deg]" />
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
      <button onClick={onBack} className="min-h-[44px] -ml-1 px-1 text-orange text-sm font-semibold mb-2 flex items-center gap-1">
        ← Back
      </button>
      <h2 className="text-xl font-bold text-chalk mb-1">{data.name}</h2>
      {allTimePR > 0 && (
        <p className="text-sm text-brass font-semibold mb-4">🏆 PR: {allTimePR}lbs</p>
      )}

      <div className="space-y-3">
        {[...sessions].reverse().map((s, i) => (
          <div key={i} className="bg-bench rounded-xl border border-seam p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-chalk">
                {s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {s.maxWeight === allTimePR && allTimePR > 0 && (
                <span className="text-xs text-brass font-bold">PR 🏆</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {s.sets.map((set, j) => (
                <div key={j} className="bg-plate rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-chalk font-semibold">{set.reps} × {set.weight ? `${set.weight}lbs` : 'BW'}</span>
                  {set.rir !== undefined && <span className="text-dust ml-1">RIR{set.rir}</span>}
                </div>
              ))}
            </div>
            {s.totalVolume > 0 && (
              <p className="text-xs text-ash mt-2">Volume: {s.totalVolume.toLocaleString()}lbs</p>
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
      <div className="text-center py-16 text-ash">
        <Award size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No records yet</p>
        <p className="text-sm mt-1">Log weighted sets to track PRs</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((r, i) => (
        <div key={i} className="bg-bench rounded-xl border border-seam p-4 flex items-center gap-3">
          <span className="text-2xl font-black text-ash w-8 text-center">{i + 1}</span>
          <div className="flex-1">
            <p className="font-bold text-chalk text-sm">{r.name}</p>
            <p className="text-xs text-dust">
              {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-brass">{r.weight}lbs</p>
            <p className="text-xs text-dust">{r.reps} reps</p>
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
    time: 'bg-orange',
    energy: 'bg-brass',
    pain: 'bg-orange',
    combination: 'bg-purple-500',
  };

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Sessions" value={totalSessions} />
        <StatCard label="Completed" value={sessions.filter(s => s.status === 'completed').length} color="text-teal" />
        <StatCard label="Ended Early" value={totalIncomplete} color="text-brass" />
      </div>

      {/* Lower back pain trend */}
      <div className="bg-bench rounded-card border border-seam p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-orange" />
          <h3 className="font-bold text-sm text-chalk">Lower Back Pain Log</h3>
        </div>
        {lowerBackInstances.length === 0 ? (
          <p className="text-xs text-ash">No lower back pain events logged 🎉</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-orange font-semibold">{lowerBackInstances.length} event{lowerBackInstances.length !== 1 ? 's' : ''}</p>
            {lowerBackInstances.map((s, i) => (
              <div key={i} className="bg-orange-deep border border-orange/40 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-orange">
                  {new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-dust">{s.workoutName}</p>
                {s.skipData?.note && (
                  <p className="text-xs text-dust italic mt-0.5">"{s.skipData.note}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Obstacle breakdown */}
      <div className="bg-bench rounded-card border border-seam p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-orange" />
          <h3 className="font-bold text-sm text-chalk">Skip Reasons</h3>
        </div>
        {totalIncomplete === 0 ? (
          <p className="text-xs text-ash">No skipped workouts yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(reasonCounts).map(([reason, count]) => {
              const pct = Math.round((count / totalIncomplete) * 100);
              return (
                <div key={reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-chalk capitalize">{reason}</span>
                    <span className="text-xs text-dust">{count}×</span>
                  </div>
                  <div className="h-2 bg-plate rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${reasonColors[reason] || 'bg-seam'}`}
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
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="font-bold text-sm text-chalk mb-3">Recent Early Endings</h3>
          <div className="space-y-2">
            {incompleteSessions.slice(0, 5).map((s, i) => (
              <div key={i} className="border-b border-seam pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-chalk">{s.workoutName}</p>
                  <p className="text-xs text-ash">
                    {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-xs text-dust capitalize">{s.skipData?.reasons?.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-chalk' }) {
  return (
    <div className="bg-bench rounded-xl border border-seam p-3 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-dust mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
