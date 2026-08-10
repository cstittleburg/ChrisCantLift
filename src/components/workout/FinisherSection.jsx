import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { CheckCircle, Circle } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';

export default function FinisherSection({ finisher }) {
  const { activeSession, logFinisher } = useWorkout();
  const done = activeSession?.finisherDone || {};
  const [durations, setDurations] = useState({});

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Finisher</span>
      </div>
      <div className="divide-y divide-gray-800">
        {finisher.map(exercise => {
          const isDone = !!done[exercise.id];
          return (
            <div key={exercise.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => {
                  if (exercise.type !== EXERCISE_TYPE.TIMED) {
                    logFinisher(exercise.id, { done: true });
                  }
                }}
              >
                {isDone
                  ? <CheckCircle size={22} className="text-green-500" />
                  : <Circle size={22} className="text-gray-600" />
                }
              </button>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${isDone ? 'text-gray-500' : 'text-white'}`}>
                  {exercise.name}
                </p>
                {exercise.note && (
                  <p className="text-xs text-gray-500">{exercise.note}</p>
                )}
              </div>
              {exercise.type === EXERCISE_TYPE.TIMED && !isDone && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="min"
                    value={durations[exercise.id] || ''}
                    onChange={e => setDurations(p => ({ ...p, [exercise.id]: e.target.value }))}
                    className="w-16 bg-gray-800 text-white text-sm rounded-lg px-2 py-2 text-center"
                  />
                  <button
                    onClick={() => {
                      if (durations[exercise.id]) {
                        logFinisher(exercise.id, { done: true, duration: parseInt(durations[exercise.id]) });
                      }
                    }}
                    className="bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
                  >
                    Log
                  </button>
                </div>
              )}
              {exercise.type === EXERCISE_TYPE.TIMED && isDone && (
                <span className="text-xs text-green-400">{done[exercise.id]?.duration}min</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
