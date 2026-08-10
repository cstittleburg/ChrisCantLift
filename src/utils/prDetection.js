import { getWorkoutSessions } from './storage';

/**
 * Epley formula: estimated 1RM = weight × (1 + reps / 30)
 * Returns 0 for bodyweight / missing data.
 */
export function epley1RM(weight, reps) {
  if (!weight || !reps || reps < 1) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Build a map of { [exerciseId]: { [weight]: bestReps } }
 * from ALL completed historical sessions (excludes the active session).
 *
 * A PR is: more reps at the same weight than any previous session.
 */
export function buildPRMap(excludeSessionId = null) {
  const sessions = getWorkoutSessions();
  const map = {}; // exerciseId -> { weight -> maxReps }

  sessions.forEach(session => {
    if (session.id === excludeSessionId) return;
    Object.entries(session.sets || {}).forEach(([exerciseId, sets]) => {
      (sets || []).forEach(s => {
        if (!s.weight || !s.reps) return;
        if (!map[exerciseId]) map[exerciseId] = {};
        const current = map[exerciseId][s.weight] || 0;
        if (s.reps > current) map[exerciseId][s.weight] = s.reps;
      });
    });
  });

  return map;
}

/**
 * Given a set { reps, weight } and a prMap, returns:
 *   'pr'  — more reps at this weight than any previous session
 *   null  — not a PR
 *
 * Note: deduplication within the current session (only one badge per weight)
 * is handled at the call site using a sessionPRWeights Set.
 */
export function checkSetPR(exerciseId, reps, weight, prMap) {
  if (!weight || !reps) return null;
  const existingReps = prMap?.[exerciseId]?.[weight];
  if (existingReps === undefined) return 'pr'; // first time ever at this weight
  if (reps > existingReps) return 'pr';
  return null;
}

/**
 * For the 1RM screen: compute best estimated 1RM per exercise across all history.
 * Returns array sorted by 1RM descending.
 */
export function computeAll1RMs(exerciseNameMap) {
  const sessions = getWorkoutSessions();
  const best = {}; // exerciseId -> { weight, reps, date, e1rm }

  sessions.forEach(session => {
    Object.entries(session.sets || {}).forEach(([exerciseId, sets]) => {
      (sets || []).forEach(s => {
        if (!s.weight || !s.reps) return;
        const e1rm = epley1RM(s.weight, s.reps);
        if (!best[exerciseId] || e1rm > best[exerciseId].e1rm) {
          best[exerciseId] = {
            weight: s.weight,
            reps: s.reps,
            date: session.startTime,
            e1rm,
          };
        }
      });
    });
  });

  return Object.entries(best)
    .map(([exerciseId, data]) => ({
      exerciseId,
      name: exerciseNameMap[exerciseId] || exerciseId,
      ...data,
    }))
    .sort((a, b) => b.e1rm - a.e1rm);
}
