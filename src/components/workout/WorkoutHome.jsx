import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Play, ChevronRight, ChevronDown, Check, Settings2, BarChart2 } from 'lucide-react';
import { PROGRAM_SEQUENCE, WORKOUT_PROGRAM } from '../../data/workoutProgram';
import ProgramEditor from './ProgramEditor';
import OneRepMaxScreen from './OneRepMaxScreen';

const focusColor = {
  heavy: 'text-red-400',
  light: 'text-green-400',
  medium: 'text-yellow-400',
};

const focusBadge = {
  heavy: 'bg-red-900/40 text-red-400 border-red-800/50',
  light: 'bg-green-900/40 text-green-400 border-green-800/50',
  medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
};

export default function WorkoutHome() {
  const { nextWorkout, nextWorkoutIndex, sessions, startWorkout, selectNextWorkout } = useWorkout();
  const [showPicker, setShowPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [show1RM, setShow1RM] = useState(false);

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  const upcomingWorkouts = Array.from({ length: 3 }, (_, i) => {
    const idx = (nextWorkoutIndex + i) % PROGRAM_SEQUENCE.length;
    return WORKOUT_PROGRAM[PROGRAM_SEQUENCE[idx]];
  });

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 pb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Today's Workout</h1>
          {lastSession && (
            <p className="text-sm text-gray-400 mt-1">
              Last: {lastSession.workoutName} · {new Date(lastSession.startTime).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setShow1RM(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-800 px-3 py-2 rounded-full"
          >
            <BarChart2 size={13} />
            1RM
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-800 px-3 py-2 rounded-full"
          >
            <Settings2 size={13} />
            Edit Program
          </button>
        </div>
      </div>

      {/* Next workout card */}
      <div className="bg-gray-900 rounded-2xl p-5 mt-4 border border-gray-800">
        <div className="flex items-start justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Up Next</span>
          {/* Workout picker trigger */}
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-400 bg-blue-900/30 border border-blue-800/50 px-2.5 py-1 rounded-full"
          >
            Change <ChevronDown size={12} />
          </button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{nextWorkout.name}</h2>
            <span className={`text-sm font-semibold ${focusColor[nextWorkout.focus] || 'text-gray-400'}`}>
              {nextWorkout.focus.charAt(0).toUpperCase() + nextWorkout.focus.slice(1)} Day
            </span>
          </div>
          <span className="text-4xl font-black text-gray-700">{nextWorkout.id}</span>
        </div>

        <div className="mt-4 space-y-1">
          {nextWorkout.supersets.map(ss => (
            <div key={ss.id} className="text-sm text-gray-400">
              <span className="text-gray-500 text-xs font-semibold">{ss.label}:</span>{' '}
              {ss.exercises.map(e => e.name).join(' + ')}
            </div>
          ))}
        </div>

        <button
          onClick={startWorkout}
          className="mt-5 w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
        >
          <Play size={22} fill="currentColor" />
          Start Workout
        </button>
      </div>

      {/* Upcoming preview */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Coming Up</h3>
        <div className="space-y-2">
          {upcomingWorkouts.slice(1).map((w, i) => (
            <div key={w.id} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between border border-gray-800">
              <div>
                <span className="text-xs text-gray-500 font-semibold">{i === 0 ? 'Next' : `+${i + 1}`}</span>
                <p className="text-sm font-semibold text-white">{w.name}</p>
              </div>
              <ChevronRight size={16} className="text-gray-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Workout picker modal */}
      {show1RM && <OneRepMaxScreen onClose={() => setShow1RM(false)} />}
      {showEditor && <ProgramEditor onClose={() => setShowEditor(false)} />}

      {showPicker && (
        <WorkoutPickerModal
          currentId={nextWorkout.id}
          onSelect={(id) => { selectNextWorkout(id); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
          title="Select Workout"
          description="Choose which workout to do next. The sequence will continue from here."
        />
      )}
    </div>
  );
}

export function WorkoutPickerModal({ currentId, onSelect, onClose, title, description }) {
  return (
    <div className="fixed inset-0 bg-black/85 flex items-end justify-center z-[60]">
      <div className="bg-gray-900 rounded-t-2xl w-full max-w-lg border-t border-gray-700 pb-safe">
        <div className="px-5 pt-5 pb-3 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="px-4 py-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {PROGRAM_SEQUENCE.map(id => {
            const w = WORKOUT_PROGRAM[id];
            const isSelected = id === currentId;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-blue-900/40 border-blue-700/60'
                    : 'bg-gray-800 border-gray-700 active:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-gray-600 w-8">{id}</span>
                  <div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-blue-300' : 'text-white'}`}>{w.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${focusBadge[w.focus]}`}>
                      {w.focus.charAt(0).toUpperCase() + w.focus.slice(1)}
                    </span>
                  </div>
                </div>
                {isSelected && <Check size={18} className="text-blue-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-5 pt-2">
          <button onClick={onClose} className="w-full bg-gray-800 text-gray-300 font-semibold py-3 rounded-xl">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
