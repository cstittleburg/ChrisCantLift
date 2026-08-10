import { useState } from 'react';
import { PROGRAM_SEQUENCE, WORKOUT_PROGRAM, EXERCISE_TYPE } from '../../data/workoutProgram';
import {
  getCustomExercises, saveCustomExercise,
  getProgramOverrides, setProgramOverride, clearProgramOverride,
} from '../../utils/storage';
import { getAllExercisesMap } from '../../utils/exerciseRegistry';
import { X, Plus, Check, RotateCcw, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProgramEditor({ onClose }) {
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null); // slot exercise object
  const [overrides, setOverrides] = useState(() => getProgramOverrides());
  const [, forceUpdate] = useState(0);

  const refresh = () => {
    setOverrides(getProgramOverrides());
    forceUpdate(n => n + 1);
  };

  const handleSelectExercise = (slotId, exerciseId) => {
    setProgramOverride(slotId, exerciseId);
    refresh();
    setEditingSlot(null);
  };

  const handleReset = (slotId) => {
    clearProgramOverride(slotId);
    refresh();
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white">Edit Program</h2>
        <button onClick={onClose} className="text-gray-500 p-1"><X size={22} /></button>
      </div>

      <p className="text-xs text-gray-500 px-4 py-2.5 border-b border-gray-800">
        Tap any exercise to swap it with a different one. Historical data for the original exercise is always preserved.
      </p>

      {/* Workout list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {PROGRAM_SEQUENCE.map(workoutId => {
          const workout = WORKOUT_PROGRAM[workoutId];
          const isExpanded = expandedWorkout === workoutId;

          // Collect all swappable slots for this workout
          const slots = workout.supersets.flatMap(ss => ss.exercises)
            .filter(ex => ex.type === EXERCISE_TYPE.WEIGHTED);
          const accessorySlots = (workout.accessory || [])
            .filter(ex => ex.type === EXERCISE_TYPE.WEIGHTED);
          const allSlots = [...slots, ...accessorySlots];

          const overriddenCount = allSlots.filter(ex => overrides[ex.id]).length;

          return (
            <div key={workoutId} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpandedWorkout(isExpanded ? null : workoutId)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-gray-600 w-8">{workoutId}</span>
                  <div className="text-left">
                    <p className="font-bold text-white text-sm">{workout.name}</p>
                    {overriddenCount > 0 && (
                      <p className="text-xs text-blue-400">{overriddenCount} exercise{overriddenCount !== 1 ? 's' : ''} swapped</p>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-800 divide-y divide-gray-800">
                  {workout.supersets.map(ss => (
                    ss.exercises
                      .filter(ex => ex.type === EXERCISE_TYPE.WEIGHTED)
                      .map(ex => (
                        <SlotRow
                          key={ex.id}
                          slot={ex}
                          override={overrides[ex.id]}
                          label={ss.label}
                          onEdit={() => setEditingSlot(ex)}
                          onReset={() => handleReset(ex.id)}
                        />
                      ))
                  ))}
                  {(workout.accessory || [])
                    .filter(ex => ex.type === EXERCISE_TYPE.WEIGHTED)
                    .map(ex => (
                      <SlotRow
                        key={ex.id}
                        slot={ex}
                        override={overrides[ex.id]}
                        label="Accessory"
                        onEdit={() => setEditingSlot(ex)}
                        onReset={() => handleReset(ex.id)}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exercise picker modal */}
      {editingSlot && (
        <ExercisePicker
          slot={editingSlot}
          currentOverride={overrides[editingSlot.id]}
          onSelect={(exerciseId) => handleSelectExercise(editingSlot.id, exerciseId)}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  );
}

// ── Slot row ──────────────────────────────────────────────────────────────────

function SlotRow({ slot, override, label, onEdit, onReset }) {
  const allMap = getAllExercisesMap();
  const displayName = override ? (allMap[override] || override) : slot.name;
  const isOverridden = !!override;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-semibold">{label}</span>
          {isOverridden && (
            <span className="text-xs text-blue-400 font-semibold bg-blue-900/30 px-1.5 py-0.5 rounded-full">swapped</span>
          )}
        </div>
        <p className="font-semibold text-white text-sm truncate">{displayName}</p>
        {isOverridden && (
          <p className="text-xs text-gray-600 truncate">was: {slot.name}</p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {isOverridden && (
          <button
            onClick={onReset}
            className="p-2 bg-gray-800 rounded-lg text-gray-500"
            title="Restore original"
          >
            <RotateCcw size={14} />
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-2 bg-gray-800 rounded-lg text-blue-400"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Exercise picker ───────────────────────────────────────────────────────────

function ExercisePicker({ slot, currentOverride, onSelect, onClose }) {
  const [showCreate, setShowCreate] = useState(false);
  const [customExercises, setCustomExercises] = useState(() => getCustomExercises());
  const [search, setSearch] = useState('');

  const allMap = getAllExercisesMap();

  // Build list: custom exercises first, then built-in weighted exercises (deduplicated)
  const builtInWeighted = [];
  const seen = new Set();
  Object.values(WORKOUT_PROGRAM).forEach(workout => {
    workout.supersets.flatMap(ss => ss.exercises)
      .filter(ex => ex.type === EXERCISE_TYPE.WEIGHTED)
      .forEach(ex => {
        if (!seen.has(ex.id)) {
          seen.add(ex.id);
          builtInWeighted.push({ id: ex.id, name: ex.name });
        }
      });
  });

  const filteredCustom = customExercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBuiltIn = builtInWeighted.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) && e.id !== slot.id
  );

  const handleCreate = (exercise) => {
    saveCustomExercise(exercise);
    setCustomExercises(getCustomExercises());
    onSelect(exercise.id);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
      <div className="bg-gray-900 rounded-t-2xl w-full max-w-lg border-t border-gray-700 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
          <div>
            <h3 className="font-bold text-white">Swap Exercise</h3>
            <p className="text-xs text-gray-500 mt-0.5">Replacing: <span className="text-gray-300">{slot.name}</span></p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {/* Create new */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 bg-blue-900/30 border border-blue-800/50 rounded-xl px-4 py-3"
          >
            <Plus size={18} className="text-blue-400" />
            <span className="text-blue-400 font-semibold text-sm">Create new exercise</span>
          </button>

          {/* Custom exercises */}
          {filteredCustom.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">My Exercises</p>
              <div className="space-y-1">
                {filteredCustom.map(ex => (
                  <ExerciseOption
                    key={ex.id}
                    exercise={ex}
                    isSelected={currentOverride === ex.id}
                    onSelect={() => onSelect(ex.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Built-in exercises */}
          {filteredBuiltIn.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Program Exercises</p>
              <div className="space-y-1">
                {filteredBuiltIn.map(ex => (
                  <ExerciseOption
                    key={ex.id}
                    exercise={ex}
                    isSelected={currentOverride === ex.id}
                    onSelect={() => onSelect(ex.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredCustom.length === 0 && filteredBuiltIn.length === 0 && search && (
            <p className="text-gray-600 text-sm text-center py-4">No matches — create a new exercise above</p>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateExerciseModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function ExerciseOption({ exercise, isSelected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left ${
        isSelected ? 'bg-blue-900/40 border border-blue-700/60' : 'bg-gray-800'
      }`}
    >
      <span className={`font-semibold text-sm ${isSelected ? 'text-blue-300' : 'text-white'}`}>
        {exercise.name}
      </span>
      {isSelected && <Check size={16} className="text-blue-400" />}
    </button>
  );
}

// ── Create exercise modal ─────────────────────────────────────────────────────

function CreateExerciseModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Exercise name is required'); return; }

    const exercise = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      note: note.trim(),
      type: EXERCISE_TYPE.WEIGHTED,
      isCustom: true,
    };
    onSave(exercise);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">New Exercise</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Exercise Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Flat Dumbbell Press"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Note <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. slow eccentric, neutral grip"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <p className="text-xs text-gray-600">
            Logs weight, reps, and RIR — same as all weighted exercises.
          </p>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 bg-gray-800 text-gray-300 font-semibold py-3 rounded-xl text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">
              Create & Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
