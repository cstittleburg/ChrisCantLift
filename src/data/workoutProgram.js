// 6-day Upper/Lower Undulating Program
// Sequence: U1 -> L1 -> U2 -> L2 -> U3 -> L3 -> repeat
// Exercise IDs include focus (heavy/light/medium) so weight memory is tracked per rep range
// Swapped-out exercises move to RETIRED_EXERCISES (bottom of file) so past workouts keep their names

export const PROGRAM_SEQUENCE = ['U1', 'L1', 'U2', 'L2', 'U3', 'L3'];

// Exercise types
export const EXERCISE_TYPE = {
  WEIGHTED: 'weighted',               // logs weight + reps + RIR
  WEIGHTED_NO_RIR: 'weighted_no_rir', // logs weight + reps, no RIR
  BODYWEIGHT: 'bodyweight',           // logs done/not done
  TIMED: 'timed',                     // logs duration
  REPS_ONLY: 'reps_only',             // logs reps only (no weight)
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
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'pin-squat-heavy', name: 'Pin Squat 0–60°', sets: 3, repsTarget: 5, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'core-twist-heavy', name: 'Core Twist', sets: 3, repsTarget: 10, type: EXERCISE_TYPE.WEIGHTED_NO_RIR },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'sl-rdl-heavy', name: 'Single Leg RDL', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'weighted-situp-heavy', name: 'Weighted Sit-Up', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'elevated-foot-lunge-heavy', name: 'Elevated Foot Lunge', sets: 2, repsTarget: 10, repsMin: 8, note: 'each leg', type: EXERCISE_TYPE.WEIGHTED_NO_RIR },
          { id: 'lying-kb-abduction-heavy', name: 'Lying KB Abduction', sets: 2, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED_NO_RIR },
        ],
      },
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
      { id: 'u2-heavy-bag', name: 'Heavy Bag HIIT', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },

  L2: {
    id: 'L2',
    name: 'Lower 2 — Light',
    type: 'lower',
    focus: 'light',
    warmUp: [
      { id: 'wu-tke', name: 'Banded TKEs', sets: 2, reps: 15, note: 'each leg', type: EXERCISE_TYPE.REPS_ONLY },
      { id: 'wu-wrist-curl', name: 'Wrist Curls', sets: 2, reps: 15, note: 'each wrist, 5lb', type: EXERCISE_TYPE.REPS_ONLY },
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
          { id: 'step-up-light', name: 'Step Up', sets: 2, repsTarget: 10, note: 'each leg', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'cable-crunch-light', name: 'Cable Crunch', sets: 2, repsTarget: 10, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'elevated-foot-lunge-light', name: 'Elevated Foot Lunge', sets: 2, repsTarget: 10, repsMin: 8, note: 'each leg', type: EXERCISE_TYPE.WEIGHTED_NO_RIR },
          { id: 'banded-side-walk-light', name: 'Banded Side Walk', sets: 2, repsTarget: 15, repsMin: 12, note: 'each side', type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
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
          { id: 'dips-medium', name: 'Dips', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.REPS_ONLY },
          { id: 'inc-curl-medium', name: 'Incline Dumbbell Curl', sets: 2, repsTarget: 15, repsMin: 12, note: 'slow eccentric', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
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
    ],
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'rdl-medium', name: 'Romanian Deadlift', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'db-farmers-carry-medium', name: 'DB Farmers Carry', sets: 3, repsTarget: 40, note: 'count steps as reps', type: EXERCISE_TYPE.WEIGHTED_NO_RIR },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'split-squat-medium', name: 'Split Squat', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'pendulum-walk-medium', name: 'Pendulum Walk', sets: 2, repsTarget: 40, note: 'count steps as reps', type: EXERCISE_TYPE.WEIGHTED_NO_RIR },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'copenhagen-plank-medium', name: 'Copenhagen Plank', sets: 2, repsTarget: 15, repsMin: 12, note: 'each side', type: EXERCISE_TYPE.REPS_ONLY },
          { id: 'jefferson-curl-medium', name: 'Jefferson Curl', sets: 2, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'l3-heavy-bag', name: 'Heavy Bag HIIT', type: EXERCISE_TYPE.TIMED, note: 'log duration only' },
    ],
  },
};

// Exercises that have been swapped out of the program. Their IDs stay in saved
// workouts, so this maps each one to its old name; History, Progress and 1RM use
// it to label past sets. Display only: saved workouts are never changed.
// When you swap an exercise out, move its { id, name } here.
export const RETIRED_EXERCISES = {
  // U1
  'db-inc-fly-heavy': 'DB Incline Chest Fly',
  'inc-curl-heavy': 'Incline Dumbbell Curl',
  // L1
  'rdl-heavy': 'Romanian Deadlift',
  'bss-heavy': 'Bulgarian Split Squat',
  'nordic-heavy': 'Nordic Hamstring',
  'leg-raise-heavy': 'Lying Leg Raise',
  'single-leg-squat-heavy': 'Single Leg Squat',
  'pistol-squat-heavy': 'Pistol Squat',
  'spanish-squat-heavy': 'Spanish Squat',
  // U2
  'lat-pulldown-light': 'Lat Pulldown',
  'inc-db-press-light': 'Incline Dumbbell Press',
  'cs-db-row-light': 'Chest Supported Dumbbell Row',
  // L2
  'step-down-rev-lunge-medium': 'Step Down Reverse Lunge 8-inch',
  'sl-rdl-medium': 'Single Leg Romanian Deadlift',
  'kb-hip-abduction-medium': 'Kettlebell Hip Abduction',
  'core-twist-l2-medium': 'Core Twist',
  'db-seated-knee-ext-light': 'DB Seated Knee Ext',
  // U3
  'ohp-medium': 'Overhead Press',
  // L3
  'sldl-medium': 'Stiff Leg Deadlift',
  'goblet-squat-medium': 'Heels-Elevated Goblet Squat',
  'rev-lunge-medium': 'Reverse Dumbbell Lunge from 8-inch Step',
  'spanish-squat-l3-medium': 'Spanish Squat',
  'core-twist-l3-medium': 'Core Twist',
  'cable-crunch-medium': 'Cable Crunch',
};
