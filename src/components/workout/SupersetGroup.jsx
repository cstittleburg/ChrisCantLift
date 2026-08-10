import ExerciseCard from './ExerciseCard';
import { resolveExercise } from '../../utils/exerciseRegistry';

export default function SupersetGroup({ superset }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{superset.label}</span>
        <div className="flex-1 h-px bg-blue-900/50" />
      </div>
      <div className="bg-gray-900 rounded-2xl border border-blue-900/30 overflow-hidden divide-y divide-gray-800">
        {superset.exercises.map((exercise, idx) => (
          <ExerciseCard
            key={exercise.id}
            exercise={resolveExercise(exercise)}
            isLastInSuperset={idx === superset.exercises.length - 1}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600 px-1 text-center">
        Complete A → B before resting
      </p>
    </div>
  );
}
