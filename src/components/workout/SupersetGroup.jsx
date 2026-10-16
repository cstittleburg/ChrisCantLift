import { useState, useEffect } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import ExerciseCard from './ExerciseCard';
import { resolveExercise } from '../../utils/exerciseRegistry';
import { ChevronDown, Check } from 'lucide-react';

const loggedCount = (session, ex) => (session?.sets?.[ex.id] || []).length;
const isComplete = (session, exercises) => exercises.every(ex => loggedCount(session, ex) >= ex.sets);

// "Superset A" -> "A"; "Tri-set" -> "T"; "Superset" -> "S"
const letterOf = (label) => (/\b([A-Z])$/.exec(label)?.[1]) || label.charAt(0).toUpperCase();

export default function SupersetGroup({ superset, index = 0, supersets = [superset] }) {
  const { activeSession } = useWorkout();
  const exercises = superset.exercises.map(resolveExercise);

  // The active superset is the first one that still has unlogged sets
  const activeIndex = supersets.findIndex(ss => !isComplete(activeSession, ss.exercises.map(resolveExercise)));
  const complete = isComplete(activeSession, exercises);
  const isActive = index === activeIndex;

  const [userExpanded, setUserExpanded] = useState(false);
  const [openId, setOpenId] = useState(null);

  // Whose turn it is: the first unfinished exercise with the fewest sets logged
  const counts = exercises.map(ex => loggedCount(activeSession, ex));
  const unfinished = exercises.filter((ex, i) => counts[i] < ex.sets);
  const minLogged = unfinished.length ? Math.min(...unfinished.map(ex => loggedCount(activeSession, ex))) : 0;
  const turnId = unfinished.find(ex => loggedCount(activeSession, ex) === minLogged)?.id ?? exercises[0]?.id;

  // After any set is logged, hand focus back to whoever's turn it is
  const totalLogged = counts.reduce((a, b) => a + b, 0);
  useEffect(() => { setOpenId(null); }, [totalLogged]);

  const rounds = Math.max(...exercises.map(ex => ex.sets || 0));
  const round = Math.min(Math.min(...counts) + 1, rounds);
  const totalSets = exercises.reduce((n, ex) => n + (ex.sets || 0), 0);
  const letter = letterOf(superset.label);

  // Collapsed: not reached yet, or finished (tap to open)
  if (!isActive && !userExpanded) {
    return (
      <button
        onClick={() => setUserExpanded(true)}
        className="w-full bg-bench border border-seam rounded-card px-4 min-h-[72px] py-3 flex items-center gap-4 text-left"
      >
        <span className={`font-display font-extrabold text-3xl w-6 flex-shrink-0 ${complete ? 'text-teal' : 'text-ash'}`}>{letter}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${complete ? 'text-dust' : 'text-chalk'}`}>
            {exercises.map(e => e.name).join(' + ')}
          </p>
          <p className="text-sm text-dust tabular-nums">
            {rounds} rounds · {totalLogged} of {totalSets} sets
          </p>
        </div>
        {complete
          ? <span className="w-8 h-8 rounded-full bg-teal text-floor flex items-center justify-center flex-shrink-0" aria-label="Finished"><Check size={18} strokeWidth={3} /></span>
          : <ChevronDown size={20} className="text-ash flex-shrink-0" />}
      </button>
    );
  }

  const shownId = openId ?? turnId;

  return (
    <div className="space-y-1.5">
      <div className={`rounded-card overflow-hidden bg-bench ${isActive ? 'border-[1.5px] border-orange' : 'border border-seam'}`}>
        <button
          onClick={() => { if (!isActive) setUserExpanded(false); }}
          className={`w-full flex items-center justify-between px-4 min-h-[48px] ${isActive ? 'bg-orange-deep' : 'bg-plate'}`}
          aria-label={isActive ? undefined : `Collapse ${superset.label}`}
        >
          <span className={`font-display font-bold uppercase text-lg tracking-wide ${isActive ? 'text-orange' : complete ? 'text-teal' : 'text-chalk'}`}>
            {superset.label}
          </span>
          <span className="text-sm text-dust tabular-nums">
            {complete ? 'Done' : `Round ${round} of ${rounds}`}
          </span>
        </button>
        <div className="divide-y divide-seam">
          {exercises.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              compact={ex.id !== shownId}
              onExpand={() => setOpenId(ex.id)}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-ash text-center">One set of each, back to back, then rest</p>
    </div>
  );
}
