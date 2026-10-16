import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Check, Circle } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';

// "10 min" / "30 min easy, while working" -> 10 / 30
const minutesIn = (note) => {
  const m = /(\d+)\s*min/.exec(note || '');
  return m ? parseInt(m[1]) : null;
};

export default function FinisherSection({ finisher }) {
  const { activeSession, logFinisher } = useWorkout();
  const done = activeSession?.finisherDone || {};
  const [durations, setDurations] = useState({});
  const [custom, setCustom] = useState({}); // exercise id -> custom input open

  if (!finisher || finisher.length === 0) return null;

  return (
    <section className="bg-bench border border-seam rounded-card overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <SectionLabel>Cardio</SectionLabel>
      </div>
      <div className="divide-y divide-seam">
        {finisher.map(exercise => {
          const isDone = !!done[exercise.id];
          const isTimed = exercise.type === EXERCISE_TYPE.TIMED;
          const preset = minutesIn(exercise.note);
          const showCustom = isTimed && !isDone && (custom[exercise.id] || !preset);
          return (
            <div key={exercise.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                {isDone
                  ? <span className="w-7 h-7 rounded-full bg-teal text-floor flex items-center justify-center flex-shrink-0"><Check size={16} strokeWidth={3} /></span>
                  : <Circle size={26} className="text-seam flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${isDone ? 'text-dust' : 'text-chalk'}`}>{exercise.name}</p>
                  {exercise.note && <p className="text-sm text-dust">{exercise.note}</p>}
                </div>
                {isDone ? (
                  isTimed && <span className="text-teal font-display font-bold text-lg tabular-nums">{done[exercise.id]?.duration} min</span>
                ) : isTimed ? (
                  preset && !custom[exercise.id] && (
                    <Button variant="secondary" onClick={() => logFinisher(exercise.id, { done: true, duration: preset })} className="flex-shrink-0">
                      Log {preset} min
                    </Button>
                  )
                ) : (
                  <Button variant="secondary" onClick={() => logFinisher(exercise.id, { done: true })} className="flex-shrink-0">
                    Done
                  </Button>
                )}
              </div>

              {/* Custom duration — still available for days that run longer or shorter */}
              {showCustom && (
                <div className="flex items-center gap-2 pl-10">
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`${exercise.name} minutes`}
                    placeholder="min"
                    value={durations[exercise.id] || ''}
                    onChange={e => setDurations(p => ({ ...p, [exercise.id]: e.target.value }))}
                    className="w-24 h-11 bg-floor border border-seam rounded-input text-chalk font-display font-bold text-xl text-center tabular-nums placeholder-ash"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (durations[exercise.id]) {
                        logFinisher(exercise.id, { done: true, duration: parseInt(durations[exercise.id]) });
                      }
                    }}
                  >
                    Log
                  </Button>
                </div>
              )}
              {isTimed && !isDone && preset && !custom[exercise.id] && (
                <button
                  onClick={() => setCustom(p => ({ ...p, [exercise.id]: true }))}
                  className="ml-10 min-h-[44px] -my-2 text-sm text-dust underline underline-offset-2"
                >
                  Custom time
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
