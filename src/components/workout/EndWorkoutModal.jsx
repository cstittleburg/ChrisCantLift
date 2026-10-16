import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { X, AlertTriangle } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';

const SKIP_REASONS = ['time', 'energy', 'pain', 'combination'];

export default function EndWorkoutModal({ workout, session, onClose }) {
  const { endWorkoutEarly } = useWorkout();
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [note, setNote] = useState('');
  const [lowerBackPain, setLowerBackPain] = useState(false);
  const [showLowerBackPrompt, setShowLowerBackPrompt] = useState(false);

  const hasPain = selectedReasons.includes('pain');

  // Get incomplete exercises
  const allExercises = [
    ...workout.supersets.flatMap(ss => ss.exercises),
    ...(workout.accessory || []),
  ].filter(ex => ex.type === EXERCISE_TYPE.WEIGHTED);

  const incompleteExercises = allExercises.filter(ex => {
    const sets = session.sets?.[ex.id] || [];
    return sets.length < ex.sets;
  });

  const hasMajorLiftInIncomplete = incompleteExercises.some(ex =>
    ['RDL', 'Half Squat to Pins', 'Hip Thrust', 'Flat Bench', 'Incline Barbell Bench'].includes(ex.name)
  );

  const toggleReason = (reason) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleContinue = () => {
    if (hasPain && hasMajorLiftInIncomplete) {
      setShowLowerBackPrompt(true);
    } else {
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    endWorkoutEarly({
      reasons: selectedReasons,
      note,
      lowerBackPain,
      incompleteExercises: incompleteExercises.map(e => e.id),
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-end justify-center z-[60]">
      <div className="bg-bench rounded-t-2xl p-6 w-full max-w-lg border-t border-seam">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">End Workout Early</h2>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 flex items-center justify-center text-dust"><X size={22} /></button>
        </div>

        {!showLowerBackPrompt ? (
          <>
            <p className="text-sm text-dust mb-4">
              {incompleteExercises.length > 0
                ? `${incompleteExercises.length} exercise(s) incomplete. What caused you to end early?`
                : 'What caused you to end early?'}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {SKIP_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => toggleReason(reason)}
                  className={`py-3 rounded-xl font-semibold text-sm capitalize transition-colors ${
                    selectedReasons.includes(reason)
                      ? 'bg-orange text-floor'
                      : 'bg-plate text-chalk'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Optional note..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-plate text-chalk rounded-xl px-4 py-3 text-sm mb-4 resize-none"
              rows={2}
            />

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-plate text-chalk rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={selectedReasons.length === 0}
                className="flex-1 py-3 bg-orange text-floor rounded-xl font-bold disabled:opacity-50"
              >
                End Workout
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-brass-deep border border-brass-edge rounded-xl p-4 mb-5 flex items-start gap-3">
              <AlertTriangle size={20} className="text-brass mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-brass">Pain reported on major lift</p>
                <p className="text-sm text-chalk mt-1">Was any pain lower-back related?</p>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setLowerBackPain(false)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm ${
                  lowerBackPain === false ? 'bg-orange text-floor' : 'bg-plate text-floor'
                }`}
              >
                No
              </button>
              <button
                onClick={() => setLowerBackPain(true)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm ${
                  lowerBackPain === true ? 'bg-orange text-floor' : 'bg-plate text-floor'
                }`}
              >
                Yes — Lower Back
              </button>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-orange text-floor rounded-xl font-bold"
            >
              Confirm & End Workout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
