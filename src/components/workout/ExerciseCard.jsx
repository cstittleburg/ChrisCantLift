import { useState, useMemo, useEffect } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { checkProgression } from '../../utils/progression';
import { buildPRMap, checkSetPR } from '../../utils/prDetection';
import { TrendingUp, Plus, Pencil, Check, X } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';

export default function ExerciseCard({ exercise }) {
  const { activeSession, logSet, updateSet, getLastWeight } = useWorkout();

  const [input, setInput] = useState({ reps: '', weight: '', rir: '' });
  const [error, setError] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editInput, setEditInput] = useState({ reps: '', weight: '', rir: '' });

  const setsLogged = activeSession?.sets?.[exercise.id] || [];
  const lastWeight = getLastWeight(exercise.id);

  // Weight used most recently in THIS session wins over the stored value, so it
  // carries between sets even for exercises with no history yet (renamed/new IDs).
  const sessionWeight = useMemo(
    () => [...setsLogged].reverse().find(s => s.weight)?.weight ?? null,
    [setsLogged]
  );
  const prefillWeight = sessionWeight ?? lastWeight;

  // Seed the box with a real value rather than a grey placeholder, so the weight
  // survives re-renders, tab switches, and reloads. Never overwrites live typing.
  useEffect(() => {
    if (prefillWeight != null) {
      setInput(p => (p.weight === '' ? { ...p, weight: String(prefillWeight) } : p));
    }
  }, [prefillWeight]);

  const weightPlaceholder = prefillWeight ? String(prefillWeight) : 'lbs';

  // Build historical PR map once (excludes current session so live sets compare against history)
  const prMap = useMemo(() => buildPRMap(activeSession?.id), [activeSession?.id]);

  const progressionStatus = checkProgression(exercise, setsLogged);
  const allSetsLogged = setsLogged.length >= exercise.sets;

  if (exercise.type === EXERCISE_TYPE.BODYWEIGHT) {
    return <BodyweightExerciseCard exercise={exercise} />;
  }

  if (exercise.type === EXERCISE_TYPE.REPS_ONLY) {
    return <RepsOnlyExerciseCard exercise={exercise} />;
  }

  if (exercise.type === EXERCISE_TYPE.WEIGHTED_NO_RIR) {
    return <WeightedNoRirExerciseCard exercise={exercise} />;
  }

  const handleLog = () => {
    const reps = parseInt(input.reps);
    const weight = input.weight !== '' ? parseFloat(input.weight) : (prefillWeight ?? null);
    const rir = input.rir !== '' ? parseInt(input.rir) : null;

    if (!reps || reps < 1) { setError('Enter reps'); return; }
    if (rir === null || isNaN(rir)) { setError('Enter RIR (0 = failure)'); return; }

    setError('');
    logSet(exercise.id, {
      reps,
      weight,
      rir,
      setNumber: setsLogged.length + 1,
      timestamp: Date.now(),
    });
    // Keep weight, clear reps & RIR for next set
    setInput(p => ({ ...p, reps: '', rir: '' }));
  };

  // Track which weights have already earned a PR badge this session (dedup)
  const sessionPRWeights = new Set();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-white">{exercise.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {exercise.sets}×{exercise.repsMin ? `${exercise.repsMin}–${exercise.repsTarget}` : exercise.repsTarget}
            {lastWeight && <span className="text-blue-400 ml-2">Last: {lastWeight} lbs</span>}
          </p>
          {exercise.note && (
            <p className="text-xs text-yellow-600 mt-0.5">{exercise.note}</p>
          )}
        </div>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-lg">
          {setsLogged.length}/{exercise.sets}
        </span>
      </div>

      {/* Logged sets */}
      {setsLogged.length > 0 && (
        <div className="space-y-1 mb-3">
          {setsLogged.map((s, i) => {
            const prStatus = checkSetPR(exercise.id, s.reps, s.weight, prMap);
            let showPR = false;
            if (prStatus === 'pr' && !sessionPRWeights.has(s.weight)) {
              showPR = true;
              sessionPRWeights.add(s.weight);
            }

            const isEditing = editingIdx === i;

            if (isEditing) {
              return (
                <div key={i} className="bg-gray-700 rounded-lg px-3 py-2 space-y-2">
                  <div className="flex gap-2">
                    {[
                      { key: 'weight', label: 'Weight', mode: 'decimal' },
                      { key: 'reps', label: 'Reps', mode: 'numeric' },
                      { key: 'rir', label: 'RIR', mode: 'numeric' },
                    ].map(({ key, label, mode }) => (
                      <div key={key} className="flex-1 flex flex-col gap-1">
                        <label className="text-xs text-gray-400 text-center">{label}</label>
                        <input
                          inputMode={mode}
                          type="number"
                          value={editInput[key]}
                          onChange={e => setEditInput(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-gray-800 text-white font-bold text-base rounded-lg px-1 py-2 text-center"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingIdx(null)}
                      className="flex-1 bg-gray-800 text-gray-400 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={() => {
                        const reps = parseInt(editInput.reps);
                        const weight = editInput.weight !== '' ? parseFloat(editInput.weight) : s.weight;
                        const rir = editInput.rir !== '' ? parseInt(editInput.rir) : s.rir;
                        if (!reps || reps < 1) return;
                        updateSet(exercise.id, i, { ...s, reps, weight, rir });
                        setEditingIdx(null);
                      }}
                      className="flex-[2] bg-blue-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Check size={13} /> Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${showPR ? 'bg-yellow-900/25 border border-yellow-700/40' : 'bg-gray-800'}`}>
                {showPR ? (
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-gray-950 font-black text-xs leading-none">PR</span>
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs w-7 text-center">S{s.setNumber}</span>
                )}
                <span className="font-semibold text-white">{s.reps} reps</span>
                {s.weight && <span className={showPR ? 'text-yellow-300 font-bold' : 'text-blue-300'}>@ {s.weight} lbs</span>}
                {s.rir !== undefined && s.rir !== null && (
                  <span className="text-gray-500 text-xs ml-auto">RIR {s.rir}</span>
                )}
                <button
                  onClick={() => {
                    setEditingIdx(i);
                    setEditInput({ reps: String(s.reps ?? ''), weight: String(s.weight ?? ''), rir: String(s.rir ?? '') });
                  }}
                  className="ml-auto text-gray-600 active:text-gray-300 p-1"
                >
                  <Pencil size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Progression flag */}
      {progressionStatus === 'advance' && (
        <div className="mb-3 p-3 rounded-xl flex items-start gap-2 bg-green-900/30 border border-green-700/50">
          <TrendingUp size={16} className="text-green-400 mt-0.5" />
          <p className="text-xs font-bold text-green-400">
            Ready to advance — +5 lbs will pre-fill next session
          </p>
        </div>
      )}

      {/* Inline log form — always visible until all sets done */}
      {!allSetsLogged && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {/* Weight */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-500 text-center">Weight</label>
              <input
                inputMode="decimal"
                type="number"
                placeholder={weightPlaceholder}
                value={input.weight}
                onChange={e => setInput(p => ({ ...p, weight: e.target.value }))}
                className="w-full bg-gray-800 text-white font-bold text-lg rounded-xl px-2 py-3 text-center placeholder-gray-600"
              />
            </div>
            {/* Reps */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-500 text-center">Reps</label>
              <input
                inputMode="numeric"
                type="number"
                placeholder={exercise.repsTarget ? String(exercise.repsTarget) : '—'}
                value={input.reps}
                onChange={e => setInput(p => ({ ...p, reps: e.target.value }))}
                className="w-full bg-gray-800 text-white font-bold text-lg rounded-xl px-2 py-3 text-center placeholder-gray-600"
              />
            </div>
            {/* RIR */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-500 text-center">RIR</label>
              <input
                inputMode="numeric"
                type="number"
                placeholder="0–5"
                value={input.rir}
                onChange={e => setInput(p => ({ ...p, rir: e.target.value }))}
                className="w-full bg-gray-800 text-white font-bold text-lg rounded-xl px-2 py-3 text-center placeholder-gray-600"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleLog}
            className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} />
            Log Set {setsLogged.length + 1} of {exercise.sets}
          </button>
        </div>
      )}

      {allSetsLogged && (
        <div className="text-center py-1">
          <span className="text-green-400 text-sm font-bold">✓ All sets logged</span>
        </div>
      )}
    </div>
  );
}

// Bodyweight exercises — just a Done button per set
function BodyweightExerciseCard({ exercise }) {
  const { activeSession, logSet } = useWorkout();
  const setsLogged = activeSession?.sets?.[exercise.id] || [];
  const allDone = setsLogged.length >= exercise.sets;

  const handleLog = () => {
    logSet(exercise.id, {
      setNumber: setsLogged.length + 1,
      done: true,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-bold ${allDone ? 'text-gray-500' : 'text-white'}`}>{exercise.name}</h3>
          <p className="text-xs text-gray-500">
            {exercise.sets}×{exercise.repsTarget || exercise.reps || 'AMRAP'}
            {exercise.note && ` · ${exercise.note}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{setsLogged.length}/{exercise.sets}</span>
          {!allDone ? (
            <button
              onClick={handleLog}
              className="bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded-lg active:bg-gray-600"
            >
              Done
            </button>
          ) : (
            <span className="text-green-500 text-xs font-bold">✓ Done</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Reps-only exercises — log rep count but no weight (Core Twist, Nordic, Leg Raise, etc.)
function RepsOnlyExerciseCard({ exercise }) {
  const { activeSession, logSet, updateSet } = useWorkout();
  const [repsInput, setRepsInput] = useState('');
  const [error, setError] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editReps, setEditReps] = useState('');

  const setsLogged = activeSession?.sets?.[exercise.id] || [];
  const allDone = setsLogged.length >= exercise.sets;

  const handleLog = () => {
    const reps = parseInt(repsInput);
    if (!reps || reps < 1) { setError('Enter reps'); return; }
    setError('');
    logSet(exercise.id, {
      setNumber: setsLogged.length + 1,
      reps,
      timestamp: Date.now(),
    });
    setRepsInput('');
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-bold ${allDone ? 'text-gray-500' : 'text-white'}`}>{exercise.name}</h3>
          <p className="text-xs text-gray-500">
            {exercise.sets}×{exercise.repsMin
              ? `${exercise.repsMin}–${exercise.repsTarget}`
              : (exercise.repsTarget || exercise.reps || 'AMRAP')}
            {exercise.note && ` · ${exercise.note}`}
          </p>
        </div>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-lg">
          {setsLogged.length}/{exercise.sets}
        </span>
      </div>

      {/* Logged sets */}
      {setsLogged.length > 0 && (
        <div className="space-y-1 mb-3">
          {setsLogged.map((s, i) => {
            if (editingIdx === i) {
              return (
                <div key={i} className="bg-gray-700 rounded-lg px-3 py-2 space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs text-gray-400 text-center">Reps</label>
                      <input
                        inputMode="numeric" type="number"
                        value={editReps}
                        onChange={e => setEditReps(e.target.value)}
                        className="w-full bg-gray-800 text-white font-bold text-base rounded-lg px-1 py-2 text-center"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingIdx(null)}
                      className="flex-1 bg-gray-800 text-gray-400 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={() => {
                        const reps = parseInt(editReps);
                        if (!reps || reps < 1) return;
                        updateSet(exercise.id, i, { ...s, reps });
                        setEditingIdx(null);
                      }}
                      className="flex-[2] bg-blue-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                      <Check size={13} /> Save
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500 text-xs w-7 text-center">S{s.setNumber}</span>
                <span className="font-semibold text-white">{s.reps} reps</span>
                <button
                  onClick={() => { setEditingIdx(i); setEditReps(String(s.reps ?? '')); }}
                  className="ml-auto text-gray-600 active:text-gray-300 p-1">
                  <Pencil size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!allDone && (
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-500 text-center">Reps</label>
              <input
                inputMode="numeric"
                type="number"
                placeholder={String(exercise.repsTarget || exercise.reps || '—')}
                value={repsInput}
                onChange={e => setRepsInput(e.target.value)}
                className="w-full bg-gray-800 text-white font-bold text-lg rounded-xl px-2 py-3 text-center placeholder-gray-600"
              />
            </div>
            <button
              onClick={handleLog}
              className="flex-[2] bg-blue-600 active:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              Log Set {setsLogged.length + 1}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      )}

      {allDone && (
        <div className="text-center py-1">
          <span className="text-green-400 text-sm font-bold">✓ All sets logged</span>
        </div>
      )}
    </div>
  );
}

// Weighted exercises without RIR tracking — log weight + reps only (Core Twist, etc.)
function WeightedNoRirExerciseCard({ exercise }) {
  const { activeSession, logSet, updateSet, getLastWeight } = useWorkout();

  const [input, setInput] = useState({ reps: '', weight: '' });
  const [error, setError] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editInput, setEditInput] = useState({ reps: '', weight: '' });

  const setsLogged = activeSession?.sets?.[exercise.id] || [];
  const lastWeight = getLastWeight(exercise.id);

  // Same carry-over rule as the weighted card above — this session's weight wins.
  const sessionWeight = useMemo(
    () => [...setsLogged].reverse().find(s => s.weight)?.weight ?? null,
    [setsLogged]
  );
  const prefillWeight = sessionWeight ?? lastWeight;

  useEffect(() => {
    if (prefillWeight != null) {
      setInput(p => (p.weight === '' ? { ...p, weight: String(prefillWeight) } : p));
    }
  }, [prefillWeight]);

  const weightPlaceholder = prefillWeight ? String(prefillWeight) : 'lbs';
  const allSetsLogged = setsLogged.length >= exercise.sets;

  const prMap = useMemo(() => buildPRMap(activeSession?.id), [activeSession?.id]);
  const progressionStatus = checkProgression(exercise, setsLogged);

  const sessionPRWeights = new Set();

  const handleLog = () => {
    const reps = parseInt(input.reps);
    const weight = input.weight !== '' ? parseFloat(input.weight) : (prefillWeight ?? null);

    if (!reps || reps < 1) { setError('Enter reps'); return; }

    setError('');
    logSet(exercise.id, {
      reps,
      weight,
      setNumber: setsLogged.length + 1,
      timestamp: Date.now(),
    });
    setInput(p => ({ ...p, reps: '' }));
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-white">{exercise.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {exercise.sets}×{exercise.repsMin ? `${exercise.repsMin}–${exercise.repsTarget}` : exercise.repsTarget}
            {lastWeight && <span className="text-blue-400 ml-2">Last: {lastWeight} lbs</span>}
          </p>
          {exercise.note && (
            <p className="text-xs text-yellow-600 mt-0.5">{exercise.note}</p>
          )}
        </div>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-lg">
          {setsLogged.length}/{exercise.sets}
        </span>
      </div>

      {/* Logged sets */}
      {setsLogged.length > 0 && (
        <div className="space-y-1 mb-3">
          {setsLogged.map((s, i) => {
            const prStatus = checkSetPR(exercise.id, s.reps, s.weight, prMap);
            let showPR = false;
            if (prStatus === 'pr' && !sessionPRWeights.has(s.weight)) {
              showPR = true;
              sessionPRWeights.add(s.weight);
            }

            const isEditing = editingIdx === i;

            if (isEditing) {
              return (
                <div key={i} className="bg-gray-700 rounded-lg px-3 py-2 space-y-2">
                  <div className="flex gap-2">
                    {[
                      { key: 'weight', label: 'Weight', mode: 'decimal' },
                      { key: 'reps', label: 'Reps', mode: 'numeric' },
                    ].map(({ key, label, mode }) => (
                      <div key={key} className="flex-1 flex flex-col gap-1">
                        <label className="text-xs text-gray-400 text-center">{label}</label>
                        <input
                          inputMode={mode}
                          type="number"
                          value={editInput[key]}
                          onChange={e => setEditInput(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-gray-800 text-white font-bold text-base rounded-lg px-1 py-2 text-center"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingIdx(null)}
                      className="flex-1 bg-gray-800 text-gray-400 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={() => {
                        const reps = parseInt(editInput.reps);
                        const weight = editInput.weight !== '' ? parseFloat(editInput.weight) : s.weight;
                        if (!reps || reps < 1) return;
                        updateSet(exercise.id, i, { ...s, reps, weight });
                        setEditingIdx(null);
                      }}
                      className="flex-[2] bg-blue-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Check size={13} /> Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${showPR ? 'bg-yellow-900/25 border border-yellow-700/40' : 'bg-gray-800'}`}>
                {showPR ? (
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-gray-950 font-black text-xs leading-none">PR</span>
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs w-7 text-center">S{s.setNumber}</span>
                )}
                <span className="font-semibold text-white">{s.reps} reps</span>
                {s.weight && <span className={`ml-auto ${showPR ? 'text-yellow-300 font-bold' : 'text-blue-300'}`}>@ {s.weight} lbs</span>}
                <button
                  onClick={() => {
                    setEditingIdx(i);
                    setEditInput({ reps: String(s.reps ?? ''), weight: String(s.weight ?? '') });
                  }}
                  className="text-gray-600 active:text-gray-300 p-1"
                >
                  <Pencil size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Progression flag */}
      {progressionStatus === 'advance' && (
        <div className="mb-3 p-3 rounded-xl flex items-start gap-2 bg-green-900/30 border border-green-700/50">
          <TrendingUp size={16} className="text-green-400 mt-0.5" />
          <p className="text-xs font-bold text-green-400">
            Ready to advance — +5 lbs will pre-fill next session
          </p>
        </div>
      )}

      {/* Inline log form */}
      {!allSetsLogged && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {/* Weight */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-500 text-center">Weight</label>
              <input
                inputMode="decimal"
                type="number"
                placeholder={weightPlaceholder}
                value={input.weight}
                onChange={e => setInput(p => ({ ...p, weight: e.target.value }))}
                className="w-full bg-gray-800 text-white font-bold text-lg rounded-xl px-2 py-3 text-center placeholder-gray-600"
              />
            </div>
            {/* Reps */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-500 text-center">Reps</label>
              <input
                inputMode="numeric"
                type="number"
                placeholder={exercise.repsTarget ? String(exercise.repsTarget) : '—'}
                value={input.reps}
                onChange={e => setInput(p => ({ ...p, reps: e.target.value }))}
                className="w-full bg-gray-800 text-white font-bold text-lg rounded-xl px-2 py-3 text-center placeholder-gray-600"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleLog}
            className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} />
            Log Set {setsLogged.length + 1} of {exercise.sets}
          </button>
        </div>
      )}

      {allSetsLogged && (
        <div className="text-center py-1">
          <span className="text-green-400 text-sm font-bold">✓ All sets logged</span>
        </div>
      )}
    </div>
  );
}
