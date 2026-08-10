/**
 * One-time migration: rename old exercise IDs to new focus-labeled IDs.
 * Runs at app startup. Safe to run multiple times (idempotent).
 *
 * Old scheme: u1-inc-bench, l1-rdl, etc.
 * New scheme: inc-bench-heavy, rdl-heavy, etc.
 */

const ID_MAP = {
  // U1 — Heavy
  'u1-inc-bench':       'inc-bench-heavy',
  'u1-pullup':          'pullup-heavy',
  'u1-db-fly':          'db-inc-fly-heavy',
  'u1-inc-curl':        'inc-curl-heavy',
  'u1-bb-row':          'bb-row-heavy',
  'u1-landmine-press':  'landmine-press-heavy',
  // L1 — Heavy
  'l1-rdl':             'rdl-heavy',
  'l1-core-twist':      'core-twist-heavy',
  'l1-bss':             'bss-heavy',
  'l1-weighted-situp':  'weighted-situp-heavy',
  'l1-nordic':          'nordic-heavy',
  'l1-leg-raise':       'leg-raise-heavy',
  // U2 — Light
  'u2-inc-bench':       'inc-bench-light',
  'u2-lat-pulldown':    'lat-pulldown-light',
  'u2-inc-db-press':    'inc-db-press-light',
  'u2-cs-row':          'cs-db-row-light',
  'u2-bb-tric-ext':     'bb-tric-ext-light',
  'u2-inc-curl':        'inc-curl-light',
  // L2 — Medium
  'l2-hip-thrust':        'hip-thrust-medium',
  'l2-core-twist':        'core-twist-l2-medium',
  'l2-step-up':           'step-up-medium',
  'l2-sl-rdl':            'sl-rdl-medium',
  'l2-good-morning':      'good-morning-medium',
  'l2-kb-hip-abduction':  'kb-hip-abduction-medium',
  // U3 — Medium
  'u3-bench':         'bench-medium',
  'u3-pullup':        'pullup-medium',
  'u3-inc-db-press':  'inc-db-press-medium',
  'u3-meadows-row':   'meadows-row-medium',
  'u3-ohp':           'ohp-medium',
  'u3-inc-curl':      'inc-curl-medium',
  // L3 — Medium
  'l3-sldl':            'sldl-medium',
  'l3-core-twist':      'core-twist-l3-medium',
  'l3-goblet-squat':    'goblet-squat-medium',
  'l3-rev-lunge':       'rev-lunge-medium',
  'l3-leg-curl':        'leg-curl-medium',
  'l3-jefferson-curl':  'jefferson-curl-medium',
};

const MIGRATION_DONE_KEY = 'fitness_id_migration_v1_done';

/** Renames keys in a sets object { [exerciseId]: [...] } */
function migrateSetsObj(sets) {
  if (!sets) return sets;
  const result = {};
  for (const [id, val] of Object.entries(sets)) {
    result[ID_MAP[id] ?? id] = val;
  }
  return result;
}

export function runExerciseIdMigration() {
  // Only run once
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  try {
    // 1. Migrate active session
    const activeRaw = localStorage.getItem('fitness_active_session');
    if (activeRaw) {
      const session = JSON.parse(activeRaw);
      session.sets = migrateSetsObj(session.sets);
      localStorage.setItem('fitness_active_session', JSON.stringify(session));
    }

    // 2. Migrate saved sessions
    const sessionsRaw = localStorage.getItem('fitness_workout_sessions');
    if (sessionsRaw) {
      const sessions = JSON.parse(sessionsRaw);
      const migrated = sessions.map(s => ({ ...s, sets: migrateSetsObj(s.sets) }));
      localStorage.setItem('fitness_workout_sessions', JSON.stringify(migrated));
    }

    // 3. Migrate exercise weights
    const weightsRaw = localStorage.getItem('fitness_exercise_weights');
    if (weightsRaw) {
      const weights = JSON.parse(weightsRaw);
      const newWeights = {};
      for (const [id, val] of Object.entries(weights)) {
        newWeights[ID_MAP[id] ?? id] = val;
      }
      localStorage.setItem('fitness_exercise_weights', JSON.stringify(newWeights));
    }

    // 4. Migrate progression flags
    const flagsRaw = localStorage.getItem('fitness_progression_flags');
    if (flagsRaw) {
      const flags = JSON.parse(flagsRaw);
      const newFlags = {};
      for (const [id, val] of Object.entries(flags)) {
        newFlags[ID_MAP[id] ?? id] = val;
      }
      localStorage.setItem('fitness_progression_flags', JSON.stringify(newFlags));
    }

    localStorage.setItem(MIGRATION_DONE_KEY, '1');
    console.log('[migration] Exercise ID migration v1 complete');
  } catch (e) {
    console.error('[migration] Exercise ID migration failed', e);
  }
}
