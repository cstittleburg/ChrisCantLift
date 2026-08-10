/**
 * One-time targeted data corrections.
 * Each fix is idempotent and keyed so it only runs once.
 */

const FIX_V1_KEY = 'fitness_data_fix_v1_done';

/**
 * Fix: Barbell Row and One-Arm Landmine Press had weight/reps reversed.
 * Correct values:
 *   bb-row-heavy:        10 reps @ 155 lbs
 *   landmine-press-heavy: 10 reps @ 75 lbs
 */
export function runDataFixes() {
  if (localStorage.getItem(FIX_V1_KEY)) return;

  try {
    // Fix workout sessions
    const sessionsRaw = localStorage.getItem('fitness_workout_sessions');
    if (sessionsRaw) {
      const sessions = JSON.parse(sessionsRaw);
      let changed = false;

      sessions.forEach(session => {
        ['bb-row-heavy', 'landmine-press-heavy'].forEach(exId => {
          const sets = session.sets?.[exId];
          if (!sets) return;
          sets.forEach(s => {
            // Detect the swapped entry: weight=10, reps=155 or weight=10, reps=75
            if (s.weight === 10 && (s.reps === 155 || s.reps === 75)) {
              const correctWeight = s.reps; // e.g. 155 or 75
              const correctReps = 10;
              s.weight = correctWeight;
              s.reps = correctReps;
              changed = true;
            }
          });
        });
      });

      if (changed) {
        localStorage.setItem('fitness_workout_sessions', JSON.stringify(sessions));
      }
    }

    // Also fix active session if it's still open
    const activeRaw = localStorage.getItem('fitness_active_session');
    if (activeRaw) {
      const session = JSON.parse(activeRaw);
      let changed = false;
      ['bb-row-heavy', 'landmine-press-heavy'].forEach(exId => {
        const sets = session.sets?.[exId];
        if (!sets) return;
        sets.forEach(s => {
          if (s.weight === 10 && (s.reps === 155 || s.reps === 75)) {
            const correctWeight = s.reps;
            s.weight = correctWeight;
            s.reps = 10;
            changed = true;
          }
        });
      });
      if (changed) {
        localStorage.setItem('fitness_active_session', JSON.stringify(session));
      }
    }

    // Fix stored exercise weights if they were saved incorrectly
    const weightsRaw = localStorage.getItem('fitness_exercise_weights');
    if (weightsRaw) {
      const weights = JSON.parse(weightsRaw);
      let changed = false;
      if (weights['bb-row-heavy'] === 10) { weights['bb-row-heavy'] = 155; changed = true; }
      if (weights['landmine-press-heavy'] === 10) { weights['landmine-press-heavy'] = 75; changed = true; }
      if (changed) {
        localStorage.setItem('fitness_exercise_weights', JSON.stringify(weights));
      }
    }

    localStorage.setItem(FIX_V1_KEY, '1');
    console.log('[dataFix] v1 complete — corrected bb-row-heavy and landmine-press-heavy entries');
  } catch (e) {
    console.error('[dataFix] v1 failed', e);
  }
}
