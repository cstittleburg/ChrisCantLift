import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Check, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';
import SectionLabel from '../ui/SectionLabel';

export default function WarmUpSection({ warmUp }) {
  const { activeSession, logWarmUp } = useWorkout();
  const [collapsed, setCollapsed] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const done = activeSession?.warmUpDone || {};
  const allDone = warmUp.every(ex => done[ex.id]);

  // Everything checked: fold into one dashed row
  if (allDone && !showDone) {
    return (
      <div className="flex items-center justify-between border border-dashed border-seam rounded-tile px-4 min-h-[56px]">
        <span className="flex items-center gap-2 text-teal font-semibold"><Check size={18} /> Warm-up done</span>
        <button onClick={() => setShowDone(true)} className="min-h-[44px] px-2 text-sm text-dust underline underline-offset-2">Show</button>
      </div>
    );
  }

  return (
    <section className="bg-bench border border-seam rounded-card overflow-hidden">
      <button
        onClick={() => (allDone ? setShowDone(false) : setCollapsed(!collapsed))}
        className="w-full flex items-center justify-between px-4 min-h-[52px]"
      >
        <SectionLabel as="span">Warm-up</SectionLabel>
        <span className="flex items-center gap-2 text-sm text-dust tabular-nums">
          {Object.keys(done).length}/{warmUp.length} done
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {warmUp.map(exercise => {
            const isDone = !!done[exercise.id];
            return (
              <div key={exercise.id} className="flex items-center gap-3 p-3 rounded-xl bg-plate">
                <button
                  onClick={() => logWarmUp(exercise.id, { done: true, timestamp: Date.now() })}
                  aria-label={`Mark ${exercise.name} done`}
                  className="w-11 h-11 -m-2 flex items-center justify-center flex-shrink-0"
                >
                  {isDone
                    ? <span className="w-7 h-7 rounded-full bg-teal text-floor flex items-center justify-center"><Check size={16} strokeWidth={3} /></span>
                    : <Circle size={26} className="text-ash" />}
                </button>
                <div className="flex-1">
                  <p className={`font-semibold ${isDone ? 'text-dust' : 'text-chalk'}`}>{exercise.name}</p>
                  <p className="text-sm text-dust">
                    {exercise.sets && `${exercise.sets}×`}
                    {exercise.reps && `${exercise.reps}`}
                    {exercise.duration && `${exercise.duration}s`}
                    {exercise.note && ` · ${exercise.note}`}
                  </p>
                </div>
                {exercise.type === EXERCISE_TYPE.TIMED && !isDone && (
                  <input
                    type="number"
                    placeholder="sec"
                    aria-label={`${exercise.name} seconds`}
                    className="w-20 h-11 bg-floor border border-seam text-chalk rounded-input px-2 text-center tabular-nums"
                    onBlur={(e) => {
                      if (e.target.value) logWarmUp(exercise.id, { done: true, duration: parseInt(e.target.value) });
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
