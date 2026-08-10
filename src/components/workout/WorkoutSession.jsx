import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import WarmUpSection from './WarmUpSection';
import SupersetGroup from './SupersetGroup';
import AccessorySection from './AccessorySection';
import FinisherSection from './FinisherSection';
import EndWorkoutModal from './EndWorkoutModal';
import { WorkoutPickerModal } from './WorkoutHome';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { WORKOUT_PROGRAM } from '../../data/workoutProgram';

export default function WorkoutSession() {
  const { activeSession, completeWorkout, switchSessionWorkout } = useWorkout();
  const [showEndModal, setShowEndModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showSwitchPicker, setShowSwitchPicker] = useState(false);

  const workout = WORKOUT_PROGRAM[activeSession.workoutId];
  const elapsed = Math.floor((Date.now() - new Date(activeSession.startTime)) / 60000);

  // Count how many exercises from previous workout (if switched) still have logged sets
  const switchedFrom = activeSession.switchedFrom;
  const prevWorkout = switchedFrom ? WORKOUT_PROGRAM[switchedFrom] : null;
  const prevLoggedCount = prevWorkout
    ? prevWorkout.supersets.flatMap(ss => ss.exercises)
        .filter(ex => (activeSession.sets?.[ex.id] || []).length > 0).length
    : 0;

  const handleSwitch = (workoutId) => {
    switchSessionWorkout(workoutId);
    setShowSwitchPicker(false);
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white truncate">{workout.name}</h1>
            <button
              onClick={() => setShowSwitchPicker(true)}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-800 px-2 py-1 rounded-full"
            >
              <RefreshCw size={11} />
              Switch
            </button>
          </div>
          <p className="text-xs text-gray-400">{elapsed}m elapsed</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCompleteConfirm(true)}
            className="bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
          >
            <CheckCircle size={16} />
            Done
          </button>
          <button
            onClick={() => setShowEndModal(true)}
            className="bg-gray-800 text-gray-300 text-sm font-semibold px-3 py-2 rounded-lg"
          >
            End Early
          </button>
        </div>
      </div>

      {/* Banner shown when workout was switched — reassures user that previous sets are saved */}
      {prevWorkout && prevLoggedCount > 0 && (
        <div className="mx-4 mt-3 bg-blue-900/30 border border-blue-800/50 rounded-xl px-4 py-2.5 flex items-start gap-2">
          <RefreshCw size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300">
            Switched from <span className="font-bold">{prevWorkout.name}</span>. {prevLoggedCount} exercise{prevLoggedCount !== 1 ? 's' : ''} already logged — all saved with this session.
          </p>
        </div>
      )}

      <div className="px-4 pt-4 space-y-6 max-w-lg mx-auto">
        <WarmUpSection warmUp={workout.warmUp} />

        {workout.supersets.map(ss => (
          <SupersetGroup key={ss.id} superset={ss} />
        ))}

        {workout.accessory && workout.accessory.length > 0 && (
          <AccessorySection exercises={workout.accessory} />
        )}

        <FinisherSection finisher={workout.finisher} />
      </div>

      {/* Modals */}
      {showEndModal && (
        <EndWorkoutModal
          workout={workout}
          session={activeSession}
          onClose={() => setShowEndModal(false)}
        />
      )}

      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Complete Workout?</h2>
            <p className="text-gray-400 text-sm mb-5">This will save your session and advance to the next workout.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 bg-gray-800 text-white font-semibold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => { completeWorkout(); setShowCompleteConfirm(false); }}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwitchPicker && (
        <WorkoutPickerModal
          currentId={activeSession.workoutId}
          onSelect={handleSwitch}
          onClose={() => setShowSwitchPicker(false)}
          title="Switch Workout"
          description="Any sets already logged are kept and will save with this session."
        />
      )}
    </div>
  );
}
