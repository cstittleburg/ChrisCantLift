import { useState, useMemo, useEffect } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { checkProgression } from '../../utils/progression';
import { buildPRMap, checkSetPR } from '../../utils/prDetection';
import { TrendingUp, Plus, Pencil, Check, X } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';
import Button from '../ui/Button';
import Stepper from '../ui/Stepper';
import ChipGroup from '../ui/ChipGroup';

const RIR_OPTIONS = [0, 1, 2, 3, 4, 5].map(v => ({ value: String(v), label: v === 5 ? '5+' : String(v) }));

export const repRange = (ex) =>
  ex.repsMin ? `${ex.repsMin}–${ex.repsTarget}` : String(ex.repsTarget || ex.reps || 'AMRAP');

/**
 * One card for every exercise type.
 *   compact  — a one-line row (used for the exercise that isn't up next in a superset); tap to expand
 */
export default function ExerciseCard({ exercise, compact = false, onExpand }) {
  if (compact) return <CompactRow exercise={exercise} onExpand={onExpand} />;
  if (exercise.type === EXERCISE_TYPE.BODYWEIGHT) return <BodyweightExerciseCard exercise={exercise} />;
  return <LoggingCard exercise={exercise} />;
}

function CompactRow({ exercise, onExpand }) {
  const { activeSession } = useWorkout();
  const logged = (activeSession?.sets?.[exercise.id] || []).length;
  const done = logged >= exercise.sets;
  return (
    <button
      onClick={onExpand}
      className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3 text-left active:bg-plate"
    >
      <div className="min-w-0">
        <p className={`font-semibold truncate ${done ? 'text-dust' : 'text-chalk'}`}>{exercise.name}</p>
        <p className="text-sm text-dust">
          {exercise.sets} × {repRange(exercise)} · {done ? 'done' : 'up next'}
        </p>
      </div>
      <span className={`font-display font-bold text-lg tabular-nums flex-shrink-0 ${done ? 'text-teal' : 'text-dust'}`}>
        {logged}/{exercise.sets}
      </span>
    </button>
  );
}

function CardHeader({ exercise, logged, lastWeight }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="text-xl font-semibold text-chalk leading-tight">{exercise.name}</h3>
        <p className="text-sm text-dust mt-0.5 tabular-nums">
          {exercise.sets} × {repRange(exercise)}
          {lastWeight ? ` · Last time ${lastWeight} lbs` : ''}
        </p>
        {exercise.note && <p className="text-sm text-brass mt-0.5">{exercise.note}</p>}
      </div>
      <span className="font-display font-bold text-2xl tabular-nums text-dust flex-shrink-0">
        {logged}/{exercise.sets}
      </span>
    </div>
  );
}

const editBox = 'w-full h-11 bg-floor border border-seam rounded-input text-chalk font-display font-bold text-xl text-center tabular-nums';

// Weighted (with or without RIR) and reps-only exercises
function LoggingCard({ exercise }) {
  const { activeSession, logSet, updateSet, getLastWeight } = useWorkout();
  const hasWeight = exercise.type === EXERCISE_TYPE.WEIGHTED || exercise.type === EXERCISE_TYPE.WEIGHTED_NO_RIR;
  const hasRir = exercise.type === EXERCISE_TYPE.WEIGHTED;
  const repsDefault = exercise.repsTarget ? String(exercise.repsTarget) : '';

  const [input, setInput] = useState({ reps: repsDefault, weight: '', rir: '' });
  const [error, setError] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editInput, setEditInput] = useState({ reps: '', weight: '', rir: '' });

  const setsLogged = activeSession?.sets?.[exercise.id] || [];
  const lastWeight = hasWeight ? getLastWeight(exercise.id) : null;

  // Weight used most recently in THIS session wins over the stored value, so it
  // carries between sets even for exercises with no history yet (renamed/new IDs).
  const sessionWeight = useMemo(
    () => [...setsLogged].reverse().find(s => s.weight)?.weight ?? null,
    [setsLogged]
  );
  const prefillWeight = hasWeight ? (sessionWeight ?? lastWeight) : null;

  // Seed the box with a real value rather than a grey placeholder, so the weight
  // survives re-renders, tab switches, and reloads. Never overwrites live typing.
  useEffect(() => {
    if (prefillWeight != null) {
      setInput(p => (p.weight === '' ? { ...p, weight: String(prefillWeight) } : p));
    }
  }, [prefillWeight]);

  // Build historical PR map once (excludes current session so live sets compare against history)
  const prMap = useMemo(() => buildPRMap(activeSession?.id), [activeSession?.id]);
  const progressionStatus = hasWeight ? checkProgression(exercise, setsLogged) : null;
  const allSetsLogged = setsLogged.length >= exercise.sets;

  const handleLog = () => {
    const reps = parseInt(input.reps);
    const weight = input.weight !== '' ? parseFloat(input.weight) : (prefillWeight ?? null);
    const rir = input.rir !== '' ? parseInt(input.rir) : null;

    if (!reps || reps < 1) { setError('Enter reps'); return; }
    if (hasRir && (rir === null || isNaN(rir))) { setError('Enter RIR (0 = failure)'); return; }

    setError('');
    logSet(exercise.id, {
      reps,
      ...(hasWeight && { weight }),
      ...(hasRir && { rir }),
      setNumber: setsLogged.length + 1,
      timestamp: Date.now(),
    });
    // Keep weight; reset reps to the target and clear RIR for the next set
    setInput(p => ({ ...p, reps: repsDefault, rir: '' }));
  };

  // Track which weights have already earned a PR badge this session (dedup)
  const sessionPRWeights = new Set();

  return (
    <div className="p-4">
      <CardHeader exercise={exercise} logged={setsLogged.length} lastWeight={lastWeight} />

      {/* Logged sets */}
      {setsLogged.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {setsLogged.map((s, i) => {
            let showPR = false;
            if (hasWeight && checkSetPR(exercise.id, s.reps, s.weight, prMap) === 'pr' && !sessionPRWeights.has(s.weight)) {
              showPR = true;
              sessionPRWeights.add(s.weight);
            }

            if (editingIdx === i) {
              const fields = [
                ...(hasWeight ? [{ key: 'weight', label: 'Weight', mode: 'decimal' }] : []),
                { key: 'reps', label: 'Reps', mode: 'numeric' },
                ...(hasRir ? [{ key: 'rir', label: 'RIR', mode: 'numeric' }] : []),
              ];
              return (
                <div key={i} className="bg-plate rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    {fields.map(({ key, label, mode }) => (
                      <label key={key} className="flex-1 flex flex-col gap-1">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-dust text-center">{label}</span>
                        <input
                          inputMode={mode}
                          type="number"
                          value={editInput[key]}
                          onChange={e => setEditInput(p => ({ ...p, [key]: e.target.value }))}
                          className={editBox}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditingIdx(null)} className="flex-1 text-sm">
                      <X size={14} /> Cancel
                    </Button>
                    <button
                      onClick={() => {
                        const reps = parseInt(editInput.reps);
                        if (!reps || reps < 1) return;
                        const weight = editInput.weight !== '' ? parseFloat(editInput.weight) : s.weight;
                        const rir = editInput.rir !== '' ? parseInt(editInput.rir) : s.rir;
                        updateSet(exercise.id, i, {
                          ...s, reps,
                          ...(hasWeight && { weight }),
                          ...(hasRir && { rir }),
                        });
                        setEditingIdx(null);
                      }}
                      className="flex-[2] min-h-[44px] rounded-input bg-chalk text-floor font-bold text-sm flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`grid grid-cols-[2.5rem_1fr_auto_2.75rem] items-center gap-2 rounded-xl pl-3 min-h-[44px] ${
                  showPR ? 'bg-brass-deep border border-brass-edge' : 'bg-plate'
                }`}
              >
                {showPR ? (
                  <span className="bg-brass text-floor font-display font-bold text-xs rounded-md px-1.5 py-0.5 w-fit">PR</span>
                ) : (
                  <span className="text-sm text-ash tabular-nums">S{s.setNumber}</span>
                )}
                <span className={`font-display text-xl tabular-nums ${showPR ? 'text-brass font-bold' : 'text-chalk font-semibold'}`}>
                  {hasWeight && s.weight ? `${s.weight} × ${s.reps}` : `${s.reps} reps`}
                </span>
                <span className="text-sm text-dust tabular-nums">
                  {s.rir !== undefined && s.rir !== null ? `RIR ${s.rir}` : ''}
                </span>
                <button
                  aria-label={`Edit set ${s.setNumber}`}
                  onClick={() => {
                    setEditingIdx(i);
                    setEditInput({ reps: String(s.reps ?? ''), weight: String(s.weight ?? ''), rir: String(s.rir ?? '') });
                  }}
                  className="h-11 w-11 flex items-center justify-center text-ash active:text-chalk"
                >
                  <Pencil size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Progression flag */}
      {progressionStatus === 'advance' && (
        <div className="mb-3 p-3 rounded-tile flex items-start gap-2 bg-bench border border-teal">
          <TrendingUp size={16} className="text-teal mt-0.5 flex-shrink-0" />
          <p className="text-sm font-semibold text-chalk">
            Ready to advance — +5 lbs will pre-fill next session
          </p>
        </div>
      )}

      {/* Inline log form — always visible until all sets done */}
      {!allSetsLogged && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {hasWeight && (
              <Stepper
                label="Weight · lbs"
                value={input.weight}
                onChange={v => setInput(p => ({ ...p, weight: v }))}
                step={5}
                inputMode="decimal"
                placeholder="—"
              />
            )}
            <Stepper
              label="Reps"
              value={input.reps}
              onChange={v => setInput(p => ({ ...p, reps: v }))}
              step={1}
            />
          </div>

          {hasRir && (
            <ChipGroup
              label="Reps left in tank (RIR)"
              options={RIR_OPTIONS}
              value={input.rir}
              onChange={v => setInput(p => ({ ...p, rir: v }))}
            />
          )}

          {error && <p className="text-sm text-orange text-center" role="alert">{error}</p>}

          <Button onClick={handleLog} className="w-full">
            <Plus size={20} strokeWidth={3} />
            Log set {setsLogged.length + 1} of {exercise.sets}
          </Button>
        </div>
      )}

      {allSetsLogged && (
        <p className="min-h-[44px] flex items-center justify-center text-teal font-bold">
          <Check size={18} className="mr-1.5" /> All sets logged
        </p>
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
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className={`text-xl font-semibold ${allDone ? 'text-dust' : 'text-chalk'}`}>{exercise.name}</h3>
        <p className="text-sm text-dust">
          {exercise.sets} × {exercise.repsTarget || exercise.reps || 'AMRAP'}
          {exercise.note && ` · ${exercise.note}`}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-display font-bold text-lg tabular-nums text-dust">{setsLogged.length}/{exercise.sets}</span>
        {!allDone ? (
          <Button variant="secondary" onClick={handleLog}>Done</Button>
        ) : (
          <span className="text-teal font-bold flex items-center gap-1"><Check size={16} /> Done</span>
        )}
      </div>
    </div>
  );
}
