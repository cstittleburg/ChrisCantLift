/**
 * Check if an exercise has hit the progression target and warrants a weight increase.
 * Criteria:
 *   - At least one set has a logged weight (skip pure bodyweight / unweighted sets)
 *   - All required sets have been logged
 *   - Total reps >= sets × repsTarget
 *   - Average RIR across all sets >= 2 (exercise felt manageable)
 *
 * Returns: 'advance' | null
 */
export function checkProgression(exercise, setsLogged) {
  if (!setsLogged || setsLogged.length === 0) return null;

  // Only suggest progression for weighted exercises
  const hasWeight = setsLogged.some(s => s.weight && s.weight > 0);
  if (!hasWeight) return null;

  // Must have completed all prescribed sets
  if (setsLogged.length < exercise.sets) return null;

  const totalReps = setsLogged.reduce((sum, s) => sum + (s.reps || 0), 0);

  const setsWithRIR = setsLogged.filter(s => s.rir !== undefined && s.rir !== null);
  const avgRIR = setsWithRIR.length > 0
    ? setsWithRIR.reduce((sum, s) => sum + s.rir, 0) / setsWithRIR.length
    : 0;

  // Must have had sufficient RIR — if it was a grind, don't advance yet
  // (skipped when the exercise doesn't track RIR at all)
  if (setsWithRIR.length > 0 && avgRIR < 2) return null;

  const target = exercise.sets * exercise.repsTarget;
  return totalReps >= target ? 'advance' : null;
}
