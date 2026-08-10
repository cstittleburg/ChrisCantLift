import { WORKOUT_PROGRAM } from '../data/workoutProgram';
import { getCustomExercises, getProgramOverrides } from './storage';

/**
 * Returns a flat map of { [exerciseId]: name } for ALL exercises —
 * built-in program exercises + custom exercises.
 * Used by History to resolve names from IDs.
 */
export function getAllExercisesMap() {
  const map = {};

  Object.values(WORKOUT_PROGRAM).forEach(workout => {
    const all = [
      ...(workout.warmUp || []),
      ...workout.supersets.flatMap(ss => ss.exercises),
      ...(workout.accessory || []),
      ...(workout.finisher || []),
    ];
    all.forEach(ex => { map[ex.id] = ex.name; });
  });

  getCustomExercises().forEach(ex => { map[ex.id] = ex.name; });

  return map;
}

/**
 * Resolves a program slot exercise object to the exercise that should actually
 * be displayed and logged. If an override exists for this slot, the returned
 * object keeps all slot properties (sets, repsTarget, requiresFormCheck, etc.)
 * but replaces id and name with the target exercise.
 *
 * Returns:
 *   { ...slotExercise, id: resolvedId, name: resolvedName, slotId: original slotId, isOverridden: bool }
 */
export function resolveExercise(slotExercise) {
  const overrides = getProgramOverrides();
  const targetId = overrides[slotExercise.id];

  if (!targetId) {
    return { ...slotExercise, slotId: slotExercise.id, isOverridden: false };
  }

  // Find target in custom or built-in
  const allMap = getAllExercisesMap();
  const targetName = allMap[targetId] || targetId;

  return {
    ...slotExercise,      // keep sets, repsTarget, requiresFormCheck, etc.
    id: targetId,         // sets are logged under the new exercise's ID
    name: targetName,
    slotId: slotExercise.id,  // remember the slot for override management
    isOverridden: true,
  };
}
