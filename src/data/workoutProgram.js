// 6-day Upper/Lower Undulating Program
// Sequence: U1 -> L1 -> U2 -> L2 -> U3 -> L3 -> repeat
// Exercise IDs include focus (heavy/light/medium) so weight memory is tracked per rep range

export const PROGRAM_SEQUENCE = ['U1', 'L1', 'U2', 'L2', 'U3', 'L3'];

// Exercise types
export const EXERCISE_TYPE = {
  WEIGHTED: 'weighted',       // logs weight + reps + RIR
  BODYWEIGHT: 'bodyweight',   // logs done/not done
  TIMED: 'timed',             // logs duration
  REPS_ONLY: 'reps_only',    // logs reps only (no weight)
};

export const WORKOUT_PROGRAM = {
  U1: {
    id: 'U1',
    name: 'Upper 1 — Heavy',
    type: 'upper',
    focus: 'heavy',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wall-sit', name: 'Wall Sit', sets: 2, duration: 30, note: '30 sec', type: EXERCISE_TYPE.TIMED },
      { id: 'wu-wrist-roller-1', name: 'Wrist Roller', sets: 2, note: '2x up/down', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'inc-bench-heavy', name: 'Incline Bench Press', sets: 3, repsTarget: 5, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'pullup-heavy', name: 'Pull-Up', sets: 3, repsTarget: 5, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'inc-db-press-heavy', name: 'Incline DB Press', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'cs-db-row-heavy', name: 'Chest-Supported DB Row', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'bb-row-heavy', name: 'Barbell Row', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'landmine-press-heavy', name: 'One-Arm Landmine Press', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'u1-wrist-roller-2', name: 'Wrist Roller', sets: 2, note: '2x up/down', type: EXERCISE_TYPE.BODYWEIGHT },
      { id: 'u1-heavy-bag', name: 'Heavy Bag Steady State', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },

  L1: {
    id: 'L1',
    name: 'Lower 1 — Heavy',
    type: 'lower',
    focus: 'heavy',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wall-sit', name: 'Wall Sit', sets: 2, duration: 30, note: '30 sec', type: EXERCISE_TYPE.TIMED },
      { id: 'wu-spanish-squat', name: 'Heels-Elevated Spanish Squat', sets: 2, reps: 15, note: 'bodyweight', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'rdl-heavy', name: 'Romanian Deadlift', sets: 3, repsTarget: 5, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'core-twist-heavy', name: 'Core Twist', sets: 3, repsTarget: 10, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'bss-heavy', name: 'Bulgarian Split Squat', sets: 2, repsTarget: 10, repsMin: 8, note: '10–20lb, opposite hand to working leg', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'weighted-situp-heavy', name: 'Weighted Sit-Up', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'nordic-heavy', name: 'Nordic Hamstring', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.REPS_ONLY },
          { id: 'leg-raise-heavy', name: 'Lying Leg Raise', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
    ],
    accessory: [
      { id: 'l1-spanish-squat', name: 'Spanish Squat', sets: 2, repsTarget: 10, repsMin: 8, note: 'bodyweight only', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    finisher: [
      { id: 'l1-heavy-bag', name: 'Heavy Bag Steady State', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },

  U2: {
    id: 'U2',
    name: 'Upper 2 — Light',
    type: 'upper',
    focus: 'light',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wall-sit', name: 'Wall Sit', sets: 2, duration: 30, note: '30 sec', type: EXERCISE_TYPE.TIMED },
      { id: 'wu-wrist-roller-1', name: 'Wrist Roller', sets: 2, note: '2x up/down', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'inc-bench-light', name: 'Incline Bench Press', sets: 3, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'pullup-light', name: 'Pull-Up', sets: 3, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'db-inc-fly-light', name: 'DB Incline Chest Fly', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'lat-prayer-light', name: 'Lat Prayer', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'bb-tric-ext-light', name: 'Barbell Standing Triceps Extension', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'inc-curl-light', name: 'Incline Dumbbell Curl', sets: 2, repsTarget: 15, repsMin: 12, note: 'slow eccentric', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'u2-wrist-roller-2', name: 'Wrist Roller', sets: 2, note: '2x up/down', type: EXERCISE_TYPE.BODYWEIGHT },
      { id: 'u2-heavy-bag', name: 'Heavy Bag HIIT', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },

  L2: {
    id: 'L2',
    name: 'Lower 2 — Unilateral / Knee Health',
    type: 'lower',
    focus: 'light',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wall-sit', name: 'Wall Sit', sets: 2, duration: 30, note: '30 sec', type: EXERCISE_TYPE.TIMED },
      { id: 'wu-spanish-squat', name: 'Heels-Elevated Spanish Squat', sets: 2, reps: 15, note: 'bodyweight', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'hip-thrust-medium', name: 'Hip Thrust', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'good-morning-medium', name: 'Good Morning', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'step-down-rev-lunge-medium', name: 'Step Down Reverse Lunge 8-inch', sets: 2, repsTarget: 10, repsMin: 10, note: 'each leg, weighted', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'core-twist-l2-medium', name: 'Core Twist', sets: 2, repsTarget: 10, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'sl-rdl-medium', name: 'Single Leg Romanian Deadlift', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'kb-hip-abduction-medium', name: 'Kettlebell Hip Abduction', sets: 2, repsTarget: 15, repsMin: 12, note: 'each side', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    accessory: [
      { id: 'l2-spanish-squat', name: 'Spanish Squat', sets: 2, repsTarget: 15, repsMin: 12, note: 'bodyweight only', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    finisher: [
      { id: 'l2-heavy-bag', name: 'Heavy Bag HIIT', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },

  U3: {
    id: 'U3',
    name: 'Upper 3 — Medium',
    type: 'upper',
    focus: 'medium',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wall-sit', name: 'Wall Sit', sets: 2, duration: 30, note: '30 sec', type: EXERCISE_TYPE.TIMED },
      { id: 'wu-wrist-roller-1', name: 'Wrist Roller', sets: 2, note: '2x up/down', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'bench-medium', name: 'Bench Press', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'pullup-medium', name: 'Pull-Up', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'inc-db-press-medium', name: 'Incline Dumbbell Press', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'meadows-row-medium', name: 'Meadows Row', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'ohp-medium', name: 'Overhead Press', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'inc-curl-medium', name: 'Incline Dumbbell Curl', sets: 2, repsTarget: 15, repsMin: 12, note: 'slow eccentric', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'u3-wrist-roller-2', name: 'Wrist Roller', sets: 2, note: '2x up/down', type: EXERCISE_TYPE.BODYWEIGHT },
      { id: 'u3-heavy-bag', name: 'Heavy Bag Steady State', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },

  L3: {
    id: 'L3',
    name: 'Lower 3 — Medium',
    type: 'lower',
    focus: 'medium',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wall-sit', name: 'Wall Sit', sets: 2, duration: 30, note: '30 sec', type: EXERCISE_TYPE.TIMED },
      { id: 'wu-spanish-squat', name: 'Heels-Elevated Spanish Squat', sets: 2, reps: 15, note: 'bodyweight', type: EXERCISE_TYPE.BODYWEIGHT },
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'sldl-medium', name: 'Stiff Leg Deadlift', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'core-twist-l3-medium', name: 'Core Twist', sets: 3, repsTarget: 10, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'goblet-squat-medium', name: 'Heels-Elevated Goblet Squat', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'rev-lunge-medium', name: 'Reverse Dumbbell Lunge from 8-inch Step', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'spanish-squat-l3-medium', name: 'Spanish Squat', sets: 2, repsTarget: 15, repsMin: 12, note: 'bodyweight only', type: EXERCISE_TYPE.BODYWEIGHT },
          { id: 'jefferson-curl-medium', name: 'Jefferson Curl', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    accessory: [
      { id: 'l3-spanish-squat', name: 'Spanish Squat', sets: 2, repsTarget: 15, repsMin: 12, note: 'light load as tolerated', type: EXERCISE_TYPE.WEIGHTED },
    ],
    finisher: [
      { id: 'l3-heavy-bag', name: 'Heavy Bag HIIT', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },
};
