import { useWorkout } from '../../context/WorkoutContext';
import { resolveExercise } from '../../utils/exerciseRegistry';
import { Check, Circle } from 'lucide-react';
import SectionLabel from '../ui/SectionLabel';

export default function AccessorySection({ exercises }) {
  const { activeSession, logAccessory } = useWorkout();
  const done = activeSession?.accessoryDone || {};

  return (
    <section className="bg-bench border border-seam rounded-card overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <SectionLabel>Accessory</SectionLabel>
      </div>
      <div className="divide-y divide-seam">
        {exercises.map(exercise => {
          const resolved = resolveExercise(exercise);
          const isDone = !!done[resolved.id];
          return (
            <button
              key={exercise.id}
              onClick={() => logAccessory(resolved.id, { done: true })}
              aria-pressed={isDone}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left"
            >
              {isDone
                ? <span className="w-7 h-7 rounded-full bg-teal text-floor flex items-center justify-center flex-shrink-0"><Check size={16} strokeWidth={3} /></span>
                : <Circle size={26} className="text-seam flex-shrink-0" />}
              <div>
                <p className={`font-semibold ${isDone ? 'text-dust' : 'text-chalk'}`}>{resolved.name}</p>
                <p className="text-sm text-dust">
                  {resolved.sets}×{resolved.repsMin ? `${resolved.repsMin}–${resolved.repsTarget}` : resolved.repsTarget}
                  {resolved.note && ` · ${resolved.note}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
