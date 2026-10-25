// Weekly plan: each workout belongs to a weekday (`weekday`, 0 = Sunday)
// The week starts on Friday: FRI -> SAT -> SUN -> MON -> TUE -> WED -> THU
// Exercise IDs end in their day (e.g. rdl-fri) so each day remembers its own weights
// Swapped-out exercises move to RETIRED_EXERCISES (bottom of file) so past workouts keep their names

export const PROGRAM_SEQUENCE = ['FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'];

// Exercise types
export const EXERCISE_TYPE = {
  WEIGHTED: 'weighted',               // logs weight + reps + RIR
  WEIGHTED_NO_RIR: 'weighted_no_rir', // logs weight + reps, no RIR
  BODYWEIGHT: 'bodyweight',           // logs done/not done
  TIMED: 'timed',                     // logs duration
  REPS_ONLY: 'reps_only',             // logs reps only (no weight)
};

export const WORKOUT_PROGRAM = {
  FRI: {
    id: 'FRI',
    name: 'Fri — Lower (Heavy)',
    weekday: 5,
    type: 'lower',
    focus: 'heavy',
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'rdl-fri', name: 'RDL', sets: 3, repsTarget: 6, repsMin: 4, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'standing-plate-twist-fri', name: 'Standing Plate Twist', sets: 3, repsTarget: 8, note: 'each side', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'split-squat-fri', name: 'Split Squat', sets: 3, repsTarget: 8, repsMin: 6, note: 'each leg', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'lying-leg-raise-fri', name: 'Lying Leg Raises', sets: 3, repsTarget: 8, repsMin: 6, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'hip-thrust-fri', name: 'Hip Thrust', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'side-lying-abduction-fri', name: 'Side-Lying Abduction', sets: 3, repsTarget: 15, repsMin: 12, note: 'each side', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'fri-bag', name: 'Heavy Bag', type: EXERCISE_TYPE.TIMED, note: '10 min' },
      { id: 'fri-work-ride', name: 'Work Ride (Bike)', type: EXERCISE_TYPE.TIMED, note: '30 min easy, while working' },
    ],
  },

  SAT: {
    id: 'SAT',
    name: 'Sat — Upper (Heavy)',
    weekday: 6,
    type: 'upper',
    focus: 'heavy',
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'incline-bb-bench-sat', name: 'Incline Barbell Bench', sets: 3, repsTarget: 6, repsMin: 4, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'pullup-sat', name: 'Pull-Ups', sets: 3, repsTarget: 6, repsMin: 4, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'meadows-row-sat', name: 'Meadows Row', sets: 3, repsTarget: 8, repsMin: 6, note: 'each arm', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'assisted-dips-sat', name: 'Assisted Dips', sets: 3, repsTarget: 8, repsMin: 6, type: EXERCISE_TYPE.REPS_ONLY },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'incline-db-curl-sat', name: 'Incline DB Curl', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'incline-db-flye-sat', name: 'Incline DB Flye', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'sat-bike', name: 'Bike', type: EXERCISE_TYPE.TIMED, note: '10 min' },
    ],
  },

  SUN: {
    id: 'SUN',
    name: 'Sun — Lower (More Reps)',
    weekday: 0,
    type: 'lower',
    focus: 'reps',
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'half-squat-pins-sun', name: 'Half Squat to Pins', sets: 3, repsTarget: 6, repsMin: 4, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'db-side-bend-sun', name: 'Dumbbell Side Bend', sets: 3, repsTarget: 8, note: 'each side', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'sl-rdl-sun', name: 'Single-Leg RDL', sets: 3, repsTarget: 8, repsMin: 6, note: 'each leg', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'jefferson-curl-sun', name: 'Jefferson Curl', sets: 3, repsTarget: 8, repsMin: 6, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'step-up-sun', name: 'Step-Ups', sets: 3, repsTarget: 10, repsMin: 8, note: 'each leg', type: EXERCISE_TYPE.WEIGHTED },
          { id: 'side-lying-abduction-sun', name: 'Side-Lying Abduction', sets: 3, repsTarget: 15, repsMin: 12, note: 'each side', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'sun-bike', name: 'Bike', type: EXERCISE_TYPE.TIMED, note: '10 min' },
    ],
  },

  MON: {
    id: 'MON',
    name: 'Mon — Upper (More Reps)',
    weekday: 1,
    type: 'upper',
    focus: 'reps',
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset A',
        exercises: [
          { id: 'incline-db-bench-mon', name: 'Incline DB Bench', sets: 3, repsTarget: 6, repsMin: 4, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'bb-row-mon', name: 'Barbell Row', sets: 3, repsTarget: 6, repsMin: 4, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-b',
        label: 'Superset B',
        exercises: [
          { id: 'cs-db-row-mon', name: 'Chest-Supported DB Row', sets: 3, repsTarget: 8, repsMin: 6, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'lat-prayer-pulldown-mon', name: 'Lat Prayer Pulldown', sets: 3, repsTarget: 8, repsMin: 6, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
      {
        id: 'ss-c',
        label: 'Superset C',
        exercises: [
          { id: 'bb-curl-mon', name: 'Barbell Curl', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'bb-oh-tricep-ext-mon', name: 'Barbell Overhead Triceps Extension', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'mon-bag', name: 'Heavy Bag', type: EXERCISE_TYPE.TIMED, note: '10 min' },
      { id: 'mon-work-ride', name: 'Work Ride (Bike)', type: EXERCISE_TYPE.TIMED, note: '30 min easy, while working' },
    ],
  },

  TUE: {
    id: 'TUE',
    name: 'Tue — Short Day',
    weekday: 2,
    type: 'short',
    focus: 'short',
    supersets: [
      {
        id: 'tri',
        label: 'Tri-set',
        exercises: [
          { id: 'hammer-curl-tue', name: 'Hammer Curl', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'cable-pushdown-tue', name: 'Cable Pushdown', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'jefferson-curl-tue', name: 'Jefferson Curl', sets: 3, repsTarget: 15, repsMin: 12, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'tue-cardio', name: 'Bag or Bike', type: EXERCISE_TYPE.TIMED, note: '20 min' },
    ],
  },

  WED: {
    id: 'WED',
    name: 'Wed — Short Day',
    weekday: 3,
    type: 'short',
    focus: 'short',
    supersets: [
      {
        id: 'ss-a',
        label: 'Superset',
        exercises: [
          { id: 'flat-bench-wed', name: 'Flat Bench', sets: 3, repsTarget: 10, repsMin: 8, note: '2–3 reps in reserve', type: EXERCISE_TYPE.WEIGHTED },
          { id: 't-bar-row-wed', name: 'T-Bar Row', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'wed-cardio', name: 'Bag or Bike', type: EXERCISE_TYPE.TIMED, note: '20 min' },
    ],
  },

  THU: {
    id: 'THU',
    name: 'Thu — Short Day',
    weekday: 4,
    type: 'short',
    focus: 'short',
    supersets: [
      {
        id: 'tri',
        label: 'Tri-set',
        exercises: [
          { id: 'incline-db-curl-thu', name: 'Incline DB Curl', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'oh-cable-tricep-ext-thu', name: 'Overhead Cable Triceps Extension', sets: 3, repsTarget: 10, repsMin: 8, type: EXERCISE_TYPE.WEIGHTED },
          { id: 'side-lying-abduction-thu', name: 'Side-Lying Abduction', sets: 3, repsTarget: 15, repsMin: 12, note: 'each side', type: EXERCISE_TYPE.WEIGHTED },
        ],
      },
    ],
    finisher: [
      { id: 'thu-cardio', name: 'Bag or Bike', type: EXERCISE_TYPE.TIMED, note: '20 min' },
    ],
  },
};

// Workout for a given date: the one whose `weekday` matches.
export function workoutIdForDate(date) {
  return PROGRAM_SEQUENCE.find(id => WORKOUT_PROGRAM[id].weekday === date.getDay());
}

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
  // Upper 1 — Heavy (6-day program, retired Oct 2026)
  'inc-bench-heavy': 'Incline Bench Press',
  'pullup-heavy': 'Pull-Up',
  'inc-db-press-heavy': 'Incline DB Press',
  'cs-db-row-heavy': 'Chest-Supported DB Row',
  'bb-row-heavy': 'Barbell Row',
  'landmine-press-heavy': 'One-Arm Landmine Press',
  // Lower 1 — Heavy (6-day program, retired Oct 2026)
  'pin-squat-heavy': 'Pin Squat 0–60°',
  'core-twist-heavy': 'Core Twist',
  'sl-rdl-heavy': 'Single Leg RDL',
  'weighted-situp-heavy': 'Weighted Sit-Up',
  'elevated-foot-lunge-heavy': 'Elevated Foot Lunge',
  'lying-kb-abduction-heavy': 'Lying KB Abduction',
  // Upper 2 — Light (6-day program, retired Oct 2026)
  'inc-bench-light': 'Incline Bench Press',
  'pullup-light': 'Pull-Up',
  'db-inc-fly-light': 'DB Incline Chest Fly',
  'lat-prayer-light': 'Lat Prayer',
  'bb-tric-ext-light': 'Barbell Standing Triceps Extension',
  'inc-curl-light': 'Incline Dumbbell Curl',
  // Lower 2 — Light (6-day program, retired Oct 2026)
  'hip-thrust-medium': 'Hip Thrust',
  'good-morning-medium': 'Good Morning',
  'step-up-light': 'Step Up',
  'cable-crunch-light': 'Cable Crunch',
  'elevated-foot-lunge-light': 'Elevated Foot Lunge',
  'banded-side-walk-light': 'Banded Side Walk',
  // Upper 3 — Medium (6-day program, retired Oct 2026)
  'bench-medium': 'Bench Press',
  'pullup-medium': 'Pull-Up',
  'inc-db-press-medium': 'Incline Dumbbell Press',
  'meadows-row-medium': 'Meadows Row',
  'dips-medium': 'Dips',
  'inc-curl-medium': 'Incline Dumbbell Curl',
  // Lower 3 — Medium (6-day program, retired Oct 2026)
  'rdl-medium': 'Romanian Deadlift',
  'db-farmers-carry-medium': 'DB Farmers Carry',
  'split-squat-medium': 'Split Squat',
  'pendulum-walk-medium': 'Pendulum Walk',
  'copenhagen-plank-medium': 'Copenhagen Plank',
  'jefferson-curl-medium': 'Jefferson Curl',
  // Weekly plan (swapped out Oct 2026)
  'weighted-cable-crunch-fri': 'Weighted Cable Crunch',
  'sl-glute-bridge-sun': 'Single-Leg Glute Bridge',
  'sl-glute-bridge-tue': 'Single-Leg Glute Bridge',
  'plate-twist-sun': 'Plate Twist',
};
