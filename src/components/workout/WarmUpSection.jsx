import { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { EXERCISE_TYPE } from '../../data/workoutProgram';

export default function WarmUpSection({ warmUp }) {
  const { activeSession, logWarmUp } = useWorkout();
  const [collapsed, setCollapsed] = useState(false);
  const [timers, setTimers] = useState({});

  const done = activeSession?.warmUpDone || {};

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-yellow-500">Warm-Up</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {Object.keys(done).length}/{warmUp.length} done
          </span>
          {collapsed ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {warmUp.map(exercise => {
            const isDone = !!done[exercise.id];
            return (
              <div key={exercise.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDone ? 'bg-gray-800/50' : 'bg-gray-800'}`}>
                <button
                  onClick={() => logWarmUp(exercise.id, { done: true, timestamp: Date.now() })}
                  className="flex-shrink-0"
                >
                  {isDone
                    ? <CheckCircle size={24} className="text-green-500" />
                    : <Circle size={24} className="text-gray-600" />
                  }
                </button>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isDone ? 'text-gray-500' : 'text-white'}`}>
                    {exercise.name}
                  </p>
                  <p className="text-xs text-gray-500">
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
                    className="w-16 bg-gray-700 text-white text-sm rounded-lg px-2 py-1 text-center"
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
    </div>
  );
}
