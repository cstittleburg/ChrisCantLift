/**
 * Nutrition timing and glycemic load analysis.
 *
 * Important framing: these are behavioral signals based on meal composition
 * and timing, not actual insulin measurements. Results are directional guidance
 * for someone focused on body recomposition and avoiding chronic elevated insulin
 * from grazing. Individual insulin response varies.
 */

const GRAZE_WINDOW_MS = 90 * 60 * 1000;      // < 90 min between entries = grazing risk
const MIN_GAP_MS = 2.5 * 60 * 60 * 1000;     // ideal minimum gap between meals
const RECOMMENDED_GAP_MS = 3 * 60 * 60 * 1000; // recommended gap = 3 hrs
const MAX_WINDOW_HOURS = 10;                  // target eating window

const FOOD_CATEGORIES = ['Meal', 'Snack', 'Vitamins', 'Supplement', 'Other'];
export { FOOD_CATEGORIES };

/**
 * Returns true if this entry is worth analyzing for glycemic load
 * (skip vitamins, supplements, water-only entries, etc.)
 */
function isAnalyzable(entry) {
  if (!entry.calories || entry.calories < 20) return false;
  if (entry.category === 'Vitamins' || entry.category === 'Supplement') return false;
  return true;
}

/**
 * Check if a single entry has a high-glycemic profile:
 * high carbs + low protein + low fat = fast glucose spike without a buffer.
 */
function checkGlycemicLoad(entry) {
  if (!isAnalyzable(entry)) return null;
  const carbs = entry.carbs || 0;
  const protein = entry.protein || 0;
  const fat = entry.fat || 0;
  if (carbs >= 40 && protein < 15 && fat < 8) {
    return 'High carbs with little protein or fat — adds a protein/fat source to slow absorption';
  }
  if (carbs >= 60 && protein < 25) {
    return 'Large carb load — distributing across more meals helps avoid a sharp glucose rise';
  }
  return null;
}

/**
 * Format a duration in ms as "3h 20m" (or "45m" under an hour).
 */
export function formatDuration(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Analyze a full day's food entries.
 *
 * @param entries          - the day's food entries
 * @param options.windowHours - target eating window length (default MAX_WINDOW_HOURS)
 * @param options.now      - current time, injectable so the UI can tick it live
 *
 * Returns:
 *   warnings      — Map<entryId, string> — per-entry warnings
 *   grazingPairs  — Set of entryIds that are too close to the previous entry
 *   nextMealRec   — { time: Date, message: string } | null
 *   eatingWindow  — see below | null
 *   eatWindowWarning — string | null
 */
export function analyzeNutritionDay(entries, options = {}) {
  const windowHours = options.windowHours ?? MAX_WINDOW_HOURS;
  const now = options.now ? new Date(options.now) : new Date();

  const sorted = [...entries]
    .filter(e => e.loggedAt)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

  const warnings = {};       // entryId → string
  const grazingPairs = new Set(); // entryIds that are too close to previous

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];

    // Glycemic load
    const glycWarn = checkGlycemicLoad(entry);
    if (glycWarn) warnings[entry.id] = glycWarn;

    // Grazing check (skip vitamins/supplements — they don't spike insulin)
    if (i > 0 && isAnalyzable(entry)) {
      // Find the previous analyzable entry
      let prevIdx = i - 1;
      while (prevIdx >= 0 && !isAnalyzable(sorted[prevIdx])) prevIdx--;
      if (prevIdx >= 0) {
        const gap = new Date(entry.loggedAt) - new Date(sorted[prevIdx].loggedAt);
        if (gap > 0 && gap < GRAZE_WINDOW_MS) {
          grazingPairs.add(entry.id);
        }
      }
    }
  }

  // Next meal recommendation — based on last analyzable entry
  const lastAnalyzable = [...sorted].reverse().find(isAnalyzable);
  let nextMealRec = null;
  if (lastAnalyzable) {
    const lastTime = new Date(lastAnalyzable.loggedAt);
    const nextMealTime = new Date(lastTime.getTime() + RECOMMENDED_GAP_MS);
    const now = new Date();
    if (nextMealTime > now) {
      nextMealRec = {
        time: nextMealTime,
        message: `Next meal around ${nextMealTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      };
    }
  }

  // Eating window — a forward-looking target anchored to the first real meal,
  // not a retrospective first-to-last-bite measurement. The actionable question
  // during the day is "how long do I have left before I should stop eating",
  // which is what actually keeps insulin from staying elevated.
  const analyzableEntries = sorted.filter(isAnalyzable);
  let eatingWindow = null;
  let eatWindowWarning = null;
  if (analyzableEntries.length >= 1) {
    const start = new Date(analyzableEntries[0].loggedAt);
    const lastBite = new Date(analyzableEntries[analyzableEntries.length - 1].loggedAt);
    const closesAt = new Date(start.getTime() + windowHours * 60 * 60 * 1000);

    const msRemaining = closesAt - now;
    const overrunMs = lastBite - closesAt;
    const elapsedHours = (lastBite - start) / (1000 * 60 * 60);

    eatingWindow = {
      start,
      lastBite,
      closesAt,
      windowHours,
      elapsedHours: +elapsedHours.toFixed(1),
      msRemaining,
      isOpen: msRemaining > 0,
      isGood: overrunMs <= 0,
      overrunMs: overrunMs > 0 ? overrunMs : 0,
    };

    if (overrunMs > 0) {
      eatWindowWarning = `Ate ${formatDuration(overrunMs)} past your ${windowHours}-hour window — a longer window keeps insulin elevated`;
    }
  }

  return { warnings, grazingPairs, nextMealRec, eatingWindow, eatWindowWarning };
}

/**
 * Given last week's data, compute recommended calorie/macro targets for next week.
 *
 * @param {object} currentGoals     - { calories, protein, carbs, fat }
 * @param {number} avgDailyCalories - average calories actually consumed last week
 * @param {number|null} weightStart - Sunday weigh-in from start of last week (lbs), null if unknown
 * @param {number|null} weightEnd   - Sunday weigh-in this week (lbs), null if unknown
 * @returns {object}                - { calories, protein, carbs, fat, adjustment, reasoning }
 */
export function computeNextWeekTargets(currentGoals, avgDailyCalories, weightStart, weightEnd) {
  const maintenance = currentGoals.calories; // treat current goal as maintenance proxy
  const weeklyDeficit = (maintenance - avgDailyCalories) * 7;
  const expectedLossLbs = weeklyDeficit / 3500;

  let calAdjustment = 0;
  let reasoning = '';

  if (weightStart !== null && weightEnd !== null) {
    const actualChange = weightEnd - weightStart; // negative = loss

    if (actualChange > -0.25 && expectedLossLbs > 0.3) {
      // Not losing despite a meaningful deficit — reduce by 100 cal
      calAdjustment = -100;
      reasoning = `Weight held flat despite ~${Math.round(weeklyDeficit)} cal deficit. Reducing by 100 cal to break the plateau.`;
    } else if (actualChange < -1.25) {
      // Losing faster than 1.25 lbs/week — risk muscle loss
      calAdjustment = +150;
      reasoning = `Lost ${Math.abs(actualChange).toFixed(1)} lbs — faster than the ~0.5–1 lb/week recomp target. Adding 150 cal to protect muscle.`;
    } else if (actualChange >= -1.0 && actualChange <= -0.25) {
      // On track
      calAdjustment = 0;
      reasoning = `On track — lost ${Math.abs(actualChange).toFixed(1)} lbs this week. Maintaining current targets.`;
    } else if (actualChange > 0) {
      // Gained weight
      calAdjustment = -150;
      reasoning = `Gained ${actualChange.toFixed(1)} lbs this week. Reducing by 150 cal.`;
    } else {
      calAdjustment = 0;
      reasoning = 'Maintaining current targets.';
    }
  } else {
    // No weight data — just check adherence to calorie target
    const adherence = avgDailyCalories / maintenance;
    if (adherence > 1.05) {
      reasoning = `Averaged ${Math.round(avgDailyCalories)} cal/day vs ${maintenance} cal target. Consider tightening tracking.`;
    } else if (adherence < 0.85) {
      calAdjustment = +100;
      reasoning = `Averaged ${Math.round(avgDailyCalories)} cal/day — significantly under target. Adding 100 cal to prevent metabolic adaptation.`;
    } else {
      reasoning = `Averaged ${Math.round(avgDailyCalories)} cal/day. No weight data — maintaining targets.`;
    }
  }

  const newCalories = Math.max(1600, currentGoals.calories + calAdjustment);

  // Keep protein constant (muscle preservation), adjust carbs to hit new calorie target
  const proteinCals = currentGoals.protein * 4;
  const fatCals = currentGoals.fat * 9;
  const remaining = Math.max(0, newCalories - proteinCals - fatCals);
  const newCarbs = Math.round(remaining / 4);

  return {
    calories: newCalories,
    protein: currentGoals.protein,
    carbs: Math.max(50, newCarbs),
    fat: currentGoals.fat,
    water: currentGoals.water ?? 100,
    adjustment: calAdjustment,
    reasoning,
  };
}
