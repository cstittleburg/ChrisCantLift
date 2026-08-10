import { useWorkout } from '../../context/WorkoutContext';
import { resolveExercise } from '../../utils/exerciseRegistry';
import { CheckCircle, Circle } from 'lucide-react';

export default function AccessorySection({ exercises }) {
  const { activeSession, logAccessory } = useWorkout();
  const done = activeSession?.accessoryDone || {};

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Accessory</span>
      </div>
      <div className="divide-y divide-gray-800">
        {exercises.map(exercise => {
          const resolved = resolveExercise(exercise);
          const isDone = !!done[resolved.id];
          return (
            <div key={exercise.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => logAccessory(resolved.id, { done: true })}>
                {isDone
                  ? <CheckCircle size={22} className="text-green-500" />
                  : <Circle size={22} className="text-gray-600" />
                }
              </button>
              <div>
                <p className={`font-semibold text-sm ${isDone ? 'text-gray-500' : 'text-white'}`}>
                  {resolved.name}
                </p>
                <p className="text-xs text-gray-500">
                  {resolved.sets}×{resolved.repsMin ? `${resolved.repsMin}-${resolved.repsTarget}` : resolved.repsTarget}
                  {resolved.note && ` · ${resolved.note}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
