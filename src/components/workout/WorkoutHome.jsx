import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Play, ChevronRight, ChevronDown, Check, Settings2, BarChart2 } from 'lucide-react';
import { PROGRAM_SEQUENCE, WORKOUT_PROGRAM } from '../../data/workoutProgram';
import ProgramEditor from './ProgramEditor';
import OneRepMaxScreen from './OneRepMaxScreen';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import SectionLabel from '../ui/SectionLabel';
import SyncStatus from '../ui/SyncStatus';
import { FOCUS, focusOf, FocusBadge } from '../ui/focus';

// "Fri — Lower (Heavy)" -> "Lower"; "Tue — Short Day" -> "Short Day"
export const bodyPartOf = (workout) =>
  (workout.name.split('— ')[1] || workout.type || '').replace(/\s*\(.*\)\s*/, '').trim();

export default function WorkoutHome() {
  const { nextWorkout, nextWorkoutDay, upcomingWorkouts, sessions, startWorkout, selectNextWorkout } = useWorkout();
  const [showPicker, setShowPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [show1RM, setShow1RM] = useState(false);

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  const forDate = new Date();
  if (nextWorkoutDay === 'Tomorrow') forDate.setDate(forDate.getDate() + 1);
  const dateLine = forDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).replace(',', ' ·');

  const liftCount = nextWorkout.supersets.reduce((n, ss) => n + ss.exercises.length, 0) + (nextWorkout.accessory?.length || 0);
  const cardioCount = nextWorkout.finisher?.length || 0;
  const tomorrow = upcomingWorkouts[0];

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-dust">{dateLine}</p>
        <div className="flex gap-2">
          <IconButton aria-label="One-rep max estimates" onClick={() => setShow1RM(true)}>
            <BarChart2 size={18} />
          </IconButton>
          <IconButton aria-label="Edit program" onClick={() => setShowEditor(true)}>
            <Settings2 size={18} />
          </IconButton>
        </div>
      </div>
      <h1 className="font-display font-extrabold uppercase text-[40px] leading-none mt-1">
        Chris<span className="text-orange">Can't</span>Lift
      </h1>

      <SyncStatus
        className="mt-2"
        fallback={lastSession ? `Last workout ${lastSession.workoutName}` : null}
      />

      {/* Hero card */}
      <section className="relative overflow-hidden bg-bench border border-seam rounded-card p-5 mt-5">
        <span
          aria-hidden="true"
          className="absolute -top-6 -right-3 font-display font-extrabold text-[132px] leading-none text-plate select-none pointer-events-none"
        >
          {nextWorkout.id}
        </span>

        <div className="relative">
          <div className="flex items-center justify-between">
            <SectionLabel>{nextWorkoutDay === 'Tomorrow' ? 'Up next · tomorrow' : 'Up next'}</SectionLabel>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 min-h-[44px] px-3 -mr-1 text-sm font-semibold text-chalk"
            >
              <span className="flex items-center gap-1 bg-floor border border-seam rounded-full px-3 py-1">
                Change <ChevronDown size={14} />
              </span>
            </button>
          </div>

          <h2 className="font-display font-extrabold uppercase text-5xl leading-none mt-1">{bodyPartOf(nextWorkout)}</h2>

          <div className="flex items-center gap-2 mt-3">
            <FocusBadge workout={nextWorkout} />
            <span className="text-sm text-dust">
              {liftCount} lifts · {cardioCount} cardio
            </span>
          </div>

          <ul className="mt-4 space-y-1.5">
            {nextWorkout.supersets.map((ss, i) => (
              <li key={ss.id} className="flex gap-3 text-sm text-chalk">
                <span className="font-display font-bold text-orange text-base w-4 flex-shrink-0">
                  {ss.exercises.length > 2 ? 'T' : String.fromCharCode(65 + i)}
                </span>
                <span>
                  {ss.exercises.map((e, j) => (
                    <span key={e.id}>
                      {j > 0 && <span className="text-ash"> + </span>}
                      {e.name}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>

          <Button onClick={startWorkout} className="w-full mt-5">
            <Play size={20} fill="currentColor" />
            Start workout
          </Button>
        </div>
      </section>

      {/* This week */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <SectionLabel>This week</SectionLabel>
          <span className="text-xs text-ash">Week starts Friday</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {PROGRAM_SEQUENCE.map(id => {
            const w = WORKOUT_PROGRAM[id];
            const isNext = id === nextWorkout.id;
            return (
              <div
                key={id}
                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-input ${
                  isNext ? 'bg-orange text-floor' : 'bg-bench border border-seam text-chalk'
                }`}
                aria-label={`${w.name}${isNext ? ' (up next)' : ''}`}
              >
                <span className="font-display font-bold text-base leading-none">{id}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isNext ? 'bg-floor' : focusOf(w).dot}`} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2.5">
          {Object.entries(FOCUS).map(([key, f]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-dust">
              <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />{f.label}
            </span>
          ))}
        </div>
      </section>

      {/* Tomorrow */}
      {tomorrow && (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full mt-6 mb-4 bg-bench border border-seam rounded-tile px-4 min-h-[64px] flex items-center justify-between text-left"
        >
          <div>
            <SectionLabel>{nextWorkoutDay === 'Tomorrow' ? 'Day after' : 'Tomorrow'}</SectionLabel>
            <p className="font-semibold text-chalk mt-0.5">{tomorrow.name}</p>
          </div>
          <ChevronRight size={18} className="text-ash" />
        </button>
      )}

      {show1RM && <OneRepMaxScreen onClose={() => setShow1RM(false)} />}
      {showEditor && <ProgramEditor onClose={() => setShowEditor(false)} />}

      {showPicker && (
        <WorkoutPickerModal
          currentId={nextWorkout.id}
          onSelect={(id) => { selectNextWorkout(id); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
          title="Select workout"
          description={`Pick a different workout for ${nextWorkoutDay.toLowerCase()}. After that, each day goes back to its usual workout.`}
        />
      )}
    </div>
  );
}

export function WorkoutPickerModal({ currentId, onSelect, onClose, title, description }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[60]">
      <div className="bg-bench border-t border-seam rounded-t-card w-full max-w-lg pb-6">
        <div className="px-5 pt-5 pb-3">
          <h2 className="font-display font-bold uppercase text-2xl">{title}</h2>
          {description && <p className="text-sm text-dust mt-1">{description}</p>}
        </div>
        <div className="px-4 py-2 space-y-2 max-h-[60vh] overflow-y-auto">
          {PROGRAM_SEQUENCE.map(id => {
            const w = WORKOUT_PROGRAM[id];
            const isSelected = id === currentId;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-tile border px-4 py-3 min-h-[56px] flex items-center justify-between ${
                  isSelected ? 'bg-orange-deep border-orange' : 'bg-floor border-seam active:bg-plate'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-display font-extrabold text-xl w-12 ${isSelected ? 'text-orange' : 'text-ash'}`}>{id}</span>
                  <div>
                    <p className="font-semibold text-chalk">{w.name}</p>
                    <span className={`flex items-center gap-1.5 text-xs mt-0.5 ${focusOf(w).text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${focusOf(w).dot}`} />{focusOf(w).label}
                    </span>
                  </div>
                </div>
                {isSelected && <Check size={18} className="text-orange flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="px-4 pt-3">
          <Button variant="secondary" onClick={onClose} className="w-full">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
