import { pushToCloud } from './cloudSync';

const KEYS = {
  WORKOUT_SESSIONS: 'fitness_workout_sessions',
  NEXT_WORKOUT_INDEX: 'fitness_next_workout_index',
  EXERCISE_WEIGHTS: 'fitness_exercise_weights',
  PROGRESSION_FLAGS: 'fitness_progression_flags',
  NUTRITION_LOG: 'fitness_nutrition_log',
  SAVED_FOODS: 'fitness_saved_foods',
  SAVED_MEALS: 'fitness_saved_meals',
  WEIGHT_LOG: 'fitness_weight_log',
  BODY_FAT_LOG: 'fitness_body_fat_log',
  USER_PROFILE: 'fitness_user_profile',
  NUTRITION_GOALS: 'fitness_nutrition_goals',
  CUSTOM_EXERCISES: 'fitness_custom_exercises',
  PROGRAM_OVERRIDES: 'fitness_program_overrides',
  PENDING_ADVANCES: 'fitness_pending_advances',
  WATER_LOG: 'fitness_water_log',
  DAILY_SUMMARIES: 'fitness_daily_summaries',
};

export function getItem(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    pushToCloud(key, value);
  } catch (e) {
    console.error('localStorage write failed', e);
  }
}

export function getWorkoutSessions() {
  return getItem(KEYS.WORKOUT_SESSIONS) || [];
}

export function saveWorkoutSession(session) {
  const sessions = getWorkoutSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  setItem(KEYS.WORKOUT_SESSIONS, sessions);
}

export function getNextWorkoutIndex() {
  return getItem(KEYS.NEXT_WORKOUT_INDEX) ?? 0;
}

export function setNextWorkoutIndex(index) {
  setItem(KEYS.NEXT_WORKOUT_INDEX, index);
}

export function getExerciseWeights() {
  return getItem(KEYS.EXERCISE_WEIGHTS) || {};
}

export function setExerciseWeight(exerciseId, weight) {
  const weights = getExerciseWeights();
  weights[exerciseId] = weight;
  setItem(KEYS.EXERCISE_WEIGHTS, weights);
}

export function getProgressionFlags() {
  return getItem(KEYS.PROGRESSION_FLAGS) || {};
}

export function setProgressionFlag(exerciseId, flag) {
  const flags = getProgressionFlags();
  flags[exerciseId] = flag;
  setItem(KEYS.PROGRESSION_FLAGS, flags);
}

export function getNutritionLog() {
  return getItem(KEYS.NUTRITION_LOG) || {};
}

export function saveNutritionEntry(date, entry) {
  const log = getNutritionLog();
  if (!log[date]) log[date] = [];
  log[date].push(entry);
  setItem(KEYS.NUTRITION_LOG, log);
}

export function getSavedFoods() {
  return getItem(KEYS.SAVED_FOODS) || [];
}

export function saveFood(food) {
  const foods = getSavedFoods();
  const idx = foods.findIndex(f => f.id === food.id);
  if (idx >= 0) foods[idx] = food;
  else foods.push(food);
  setItem(KEYS.SAVED_FOODS, foods);
}

export function getSavedMeals() {
  return getItem(KEYS.SAVED_MEALS) || [];
}

export function getWeightLog() {
  return getItem(KEYS.WEIGHT_LOG) || [];
}

export function logWeight(entry) {
  const log = getWeightLog();
  log.push(entry);
  setItem(KEYS.WEIGHT_LOG, log);
}

export function getBodyFatLog() {
  return getItem(KEYS.BODY_FAT_LOG) || [];
}

export function STORAGE_KEYS() {
  return KEYS;
}

export { KEYS };

export function updateNutritionEntry(date, entryId, updates) {
  const log = getNutritionLog();
  if (!log[date]) return;
  const idx = log[date].findIndex(e => e.id === entryId);
  if (idx >= 0) {
    log[date][idx] = { ...log[date][idx], ...updates };
    setItem(KEYS.NUTRITION_LOG, log);
  }
}

export function deleteNutritionEntry(date, entryId) {
  const log = getNutritionLog();
  if (!log[date]) return;
  log[date] = log[date].filter(e => e.id !== entryId);
  setItem(KEYS.NUTRITION_LOG, log);
}

export function saveMeal(meal) {
  const meals = getSavedMeals();
  const idx = meals.findIndex(m => m.id === meal.id);
  if (idx >= 0) meals[idx] = meal;
  else meals.push(meal);
  setItem(KEYS.SAVED_MEALS, meals);
}

export function deleteFood(foodId) {
  const foods = getSavedFoods();
  setItem(KEYS.SAVED_FOODS, foods.filter(f => f.id !== foodId));
}

// Default goals matching USER_PROFILE
const DEFAULT_GOALS = {
  calories: 2809,
  protein: 200,   // g
  carbs: 250,     // g
  fat: 78,        // g
  water: 100,     // oz/day
};

export function getNutritionGoals() {
  return getItem(KEYS.NUTRITION_GOALS) || DEFAULT_GOALS;
}

export function saveNutritionGoals(goals) {
  setItem(KEYS.NUTRITION_GOALS, goals);
}

// ── Custom exercises ──────────────────────────────────────────────────────────

export function getCustomExercises() {
  return getItem(KEYS.CUSTOM_EXERCISES) || [];
}

export function saveCustomExercise(exercise) {
  const all = getCustomExercises();
  const idx = all.findIndex(e => e.id === exercise.id);
  if (idx >= 0) all[idx] = exercise;
  else all.push(exercise);
  setItem(KEYS.CUSTOM_EXERCISES, all);
}

export function deleteCustomExercise(id) {
  const all = getCustomExercises().filter(e => e.id !== id);
  setItem(KEYS.CUSTOM_EXERCISES, all);
}

// ── Program overrides ─────────────────────────────────────────────────────────
// Maps slotId (program position) -> exerciseId (what to actually log/display)

export function getProgramOverrides() {
  return getItem(KEYS.PROGRAM_OVERRIDES) || {};
}

export function setProgramOverride(slotId, exerciseId) {
  const overrides = getProgramOverrides();
  overrides[slotId] = exerciseId;
  setItem(KEYS.PROGRAM_OVERRIDES, overrides);
}

export function clearProgramOverride(slotId) {
  const overrides = getProgramOverrides();
  delete overrides[slotId];
  setItem(KEYS.PROGRAM_OVERRIDES, overrides);
}

// ── Pending advances ──────────────────────────────────────────────────────────
// When progression is detected on workout completion, we store the suggested
// next weight (+5 lbs) so it pre-fills on the following session.

export function getPendingAdvances() {
  return getItem(KEYS.PENDING_ADVANCES) || {};
}

export function setPendingAdvance(exerciseId, suggestedWeight) {
  const advances = getPendingAdvances();
  advances[exerciseId] = suggestedWeight;
  setItem(KEYS.PENDING_ADVANCES, advances);
}

export function clearPendingAdvance(exerciseId) {
  const advances = getPendingAdvances();
  delete advances[exerciseId];
  setItem(KEYS.PENDING_ADVANCES, advances);
}

// ── Water log ─────────────────────────────────────────────────────────────────
// Standalone water entries separate from food entries.
// Food entries may also carry a waterOz field — both sources feed the daily total.

export function getWaterLog() {
  return getItem(KEYS.WATER_LOG) || {};
}

export function addWaterEntry(date, oz) {
  const log = getWaterLog();
  if (!log[date]) log[date] = [];
  log[date].push({ id: `water_${Date.now()}`, oz, loggedAt: new Date().toISOString() });
  setItem(KEYS.WATER_LOG, log);
}

export function deleteWaterEntry(date, entryId) {
  const log = getWaterLog();
  if (!log[date]) return;
  log[date] = log[date].filter(e => e.id !== entryId);
  setItem(KEYS.WATER_LOG, log);
}

// ── Daily summaries ───────────────────────────────────────────────────────────
// AI-generated end-of-day nutrition summaries, keyed by date string.

export function getDailySummaries() {
  return getItem(KEYS.DAILY_SUMMARIES) || {};
}

export function saveDailySummary(date, summary) {
  const all = getDailySummaries();
  all[date] = summary;
  setItem(KEYS.DAILY_SUMMARIES, all);
}

// ── Weight log helpers ────────────────────────────────────────────────────────
// Weight log is already stored; this adds a convenient keyed-by-date lookup.

export function getWeightForDate(dateStr) {
  const log = getWeightLog();
  // Find the most recent entry on or before this date
  const match = [...log]
    .filter(e => e.date <= dateStr)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return match ? match.weight : null;
}

export function logWeightForDate(dateStr, weightLbs) {
  const log = getWeightLog();
  // Replace existing entry for this date if present, otherwise append
  const idx = log.findIndex(e => e.date === dateStr);
  if (idx >= 0) {
    log[idx] = { ...log[idx], weight: weightLbs, date: dateStr };
  } else {
    log.push({ id: `w_${Date.now()}`, date: dateStr, weight: weightLbs, loggedAt: new Date().toISOString() });
  }
  setItem(KEYS.WEIGHT_LOG, log);
}
