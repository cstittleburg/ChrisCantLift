import { useState, useEffect } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import WarmUpSection from './WarmUpSection';
import SupersetGroup from './SupersetGroup';
import AccessorySection from './AccessorySection';
import FinisherSection from './FinisherSection';
import EndWorkoutModal from './EndWorkoutModal';
import { WorkoutPickerModal, bodyPartOf } from './WorkoutHome';
import { Check, RefreshCw, MoreHorizontal, LogOut } from 'lucide-react';
import { WORKOUT_PROGRAM } from '../../data/workoutProgram';
import { resolveExercise } from '../../utils/exerciseRegistry';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import SyncStatus from '../ui/SyncStatus';
import { FocusBadge } from '../ui/focus';

// Total prescribed sets vs. sets logged so far, across supersets and the accessory list.
// Accessories are checked off as a whole, so a done accessory counts all its sets.
function setProgress(workout, session) {
  let total = 0, done = 0;
  workout.supersets.flatMap(ss => ss.exercises).forEach(ex => {
    const id = resolveExercise(ex).id;
    total += ex.sets || 0;
    done += Math.min((session.sets?.[id] || []).length, ex.sets || 0);
  });
  (workout.accessory || []).forEach(ex => {
    const id = resolveExercise(ex).id;
    total += ex.sets || 0;
    if (session.accessoryDone?.[id]) done += ex.sets || 0;
  });
  return { done, total };
}

const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function WorkoutSession() {
  const { activeSession, completeWorkout, switchSessionWorkout } = useWorkout();
  const [showEndModal, setShowEndModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showSwitchPicker, setShowSwitchPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const workout = WORKOUT_PROGRAM[activeSession.workoutId];
  const elapsed = mmss(now - new Date(activeSession.startTime));
  const { done, total } = setProgress(workout, activeSession);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
    <div className="pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 bg-floor border-b border-plate px-4 pt-4 pb-3 z-10">
        <div className="flex items-start justify-between gap-3 max-w-lg mx-auto">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold uppercase text-[28px] leading-none truncate">
                {workout.id} · {bodyPartOf(workout)}
              </h1>
              <FocusBadge workout={workout} className="flex-shrink-0" />
            </div>
            <p className="text-sm text-dust tabular-nums mt-1">
              {elapsed} elapsed · {done} of {total} sets
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <IconButton aria-label="Switch workout or end early" onClick={() => setShowMenu(true)}>
              <MoreHorizontal size={20} />
            </IconButton>
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="h-11 px-4 rounded-input bg-teal text-floor font-display font-bold uppercase text-lg flex items-center gap-1.5"
            >
              <Check size={18} strokeWidth={3} />
              Finish
            </button>
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-3">
          <div
            className="h-1.5 bg-plate rounded-full overflow-hidden"
            role="img"
            aria-label={`${done} of ${total} sets logged`}
          >
            <div className="h-full bg-orange rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <SyncStatus className="mt-2" />
        </div>
      </div>

      {/* Banner shown when workout was switched — reassures user that previous sets are saved */}
      {prevWorkout && prevLoggedCount > 0 && (
        <div className="mx-4 mt-3 bg-bench border border-seam rounded-tile px-4 py-3 flex items-start gap-2 max-w-lg sm:mx-auto">
          <RefreshCw size={16} className="text-teal mt-0.5 flex-shrink-0" />
          <p className="text-sm text-dust">
            Switched from <span className="font-bold text-chalk">{prevWorkout.name}</span>. {prevLoggedCount} exercise{prevLoggedCount !== 1 ? 's' : ''} already logged — all saved with this session.
          </p>
        </div>
      )}

      <div className="px-4 pt-4 space-y-5 max-w-lg mx-auto">
        {workout.warmUp && workout.warmUp.length > 0 && (
          <WarmUpSection warmUp={workout.warmUp} />
        )}

        {workout.supersets.map((ss, i) => (
          <SupersetGroup key={ss.id} superset={ss} index={i} supersets={workout.supersets} />
        ))}

        {workout.accessory && workout.accessory.length > 0 && (
          <AccessorySection exercises={workout.accessory} />
        )}

        <FinisherSection finisher={workout.finisher} />
      </div>

      {/* "⋯" menu: switch workout / end early */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[60]" onClick={() => setShowMenu(false)}>
          <div className="bg-bench border-t border-seam rounded-t-card w-full max-w-lg p-4 pb-8 space-y-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setShowMenu(false); setShowSwitchPicker(true); }}
              className="w-full min-h-[56px] flex items-center gap-3 px-4 rounded-tile bg-floor border border-seam text-chalk font-semibold"
            >
              <RefreshCw size={18} className="text-dust" /> Switch workout
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowEndModal(true); }}
              className="w-full min-h-[56px] flex items-center gap-3 px-4 rounded-tile bg-floor border border-seam text-chalk font-semibold"
            >
              <LogOut size={18} className="text-dust" /> End early
            </button>
            <Button variant="secondary" onClick={() => setShowMenu(false)} className="w-full">Cancel</Button>
          </div>
        </div>
      )}

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
          <div className="bg-bench rounded-card p-6 w-full max-w-sm border border-seam">
            <h2 className="font-display font-bold uppercase text-2xl mb-2">Finish workout?</h2>
            <p className="text-dust text-sm mb-5">
              This will save your session ({done} of {total} sets). Up next becomes tomorrow's workout.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowCompleteConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <button
                onClick={() => { completeWorkout(); setShowCompleteConfirm(false); }}
                className="flex-1 min-h-[44px] rounded-input bg-teal text-floor font-display font-bold uppercase text-lg"
              >
                Finish
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
          title="Switch workout"
          description="Any sets already logged are kept and will save with this session."
        />
      )}
    </div>
  );
}
