/**
 * Nutrition timing and glycemic load analysis.
 *
 * Timing model — per eating occasion, not per day:
 *   1. A window OPENS when a real food item is logged.
 *   2. That window should CLOSE within MEAL_WINDOW_MS (1 hr) — finish eating.
 *   3. A new window shouldn't open until MIN_GAP_MS (2.5 hrs) after the last
 *      bite, ideally RECOMMENDED_GAP_MS (3 hrs), so insulin returns to baseline.
 *
 * Important framing: these are behavioral signals based on meal composition
 * and timing, not actual insulin measurements. Results are directional guidance
 * for someone focused on body recomposition and avoiding chronic elevated insulin
 * from grazing. Individual insulin response varies.
 */

const MEAL_WINDOW_MS = 60 * 60 * 1000;         // an eating occasion should close within 1 hr
const MIN_GAP_MS = 2.5 * 60 * 60 * 1000;       // earliest the next window may open
const RECOMMENDED_GAP_MS = 3 * 60 * 60 * 1000; // ideal gap between occasions

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
 * Group analyzable entries into eating occasions.
 * Anything logged within mealWindowMs of an occasion's open belongs to that
 * occasion — items eaten together are one window, not separate ones.
 */
function buildOccasions(entries, mealWindowMs, minGapMs) {
  const occasions = [];

  entries.forEach(entry => {
    const t = new Date(entry.loggedAt).getTime();
    const current = occasions[occasions.length - 1];

    if (current && t - current.openedAt <= mealWindowMs) {
      current.entries.push(entry);
      current.lastBiteAt = t;
      return;
    }

    const previous = current || null;
    const gapBeforeMs = previous ? t - previous.lastBiteAt : null;
    occasions.push({
      openedAt: t,
      lastBiteAt: t,
      closesAt: t + mealWindowMs,
      entries: [entry],
      gapBeforeMs,
      // Opened before insulin had time to settle. Also catches "kept eating
      // past the 1 hr window" — those bites start a new occasion immediately.
      openedTooSoon: gapBeforeMs !== null && gapBeforeMs < minGapMs,
    });
  });

  return occasions;
}

/**
 * Analyze a full day's food entries.
 *
 * @param entries                 - the day's food entries
 * @param options.mealWindowMs    - how long a window may stay open (default 1 hr)
 * @param options.minGapMs        - required rest before reopening (default 2.5 hrs)
 * @param options.now             - current time, injectable so the UI can tick it live
 *
 * Returns:
 *   warnings        — { entryId: string } — glycemic composition warnings
 *   timingWarnings  — { entryId: string } — "opened too soon" warnings
 *   occasions       — grouped eating occasions
 *   mealWindow      — live state of the current/most recent window | null
 *   dayStats        — day-level rollup for the AI summary
 */
export function analyzeNutritionDay(entries, options = {}) {
  const mealWindowMs = options.mealWindowMs ?? MEAL_WINDOW_MS;
  const minGapMs = options.minGapMs ?? MIN_GAP_MS;
  const idealGapMs = Math.max(minGapMs, RECOMMENDED_GAP_MS);
  const now = options.now ? new Date(options.now).getTime() : Date.now();

  const sorted = [...entries]
    .filter(e => e.loggedAt)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

  const warnings = {};
  const timingWarnings = {};

  sorted.forEach(entry => {
    const glycWarn = checkGlycemicLoad(entry);
    if (glycWarn) warnings[entry.id] = glycWarn;
  });

  const analyzableEntries = sorted.filter(isAnalyzable);
  const occasions = buildOccasions(analyzableEntries, mealWindowMs, minGapMs);

  occasions.forEach(occ => {
    if (!occ.openedTooSoon) return;
    const opener = occ.entries[0];
    timingWarnings[opener.id] =
      `Only ${formatDuration(occ.gapBeforeMs)} since your last bite — aim for ${formatDuration(minGapMs)}–${formatDuration(idealGapMs)} between windows`;
  });

  // Live state of the current (or most recent) window
  let mealWindow = null;
  if (occasions.length > 0) {
    const last = occasions[occasions.length - 1];
    const isOpen = now < last.closesAt;
    const nextOpenAt = last.lastBiteAt + minGapMs;
    const nextIdealOpenAt = last.lastBiteAt + idealGapMs;

    mealWindow = {
      openedAt: new Date(last.openedAt),
      lastBiteAt: new Date(last.lastBiteAt),
      closesAt: new Date(last.closesAt),
      nextOpenAt: new Date(nextOpenAt),
      nextIdealOpenAt: new Date(nextIdealOpenAt),
      isOpen,
      msUntilClose: last.closesAt - now,
      msUntilNextOpen: nextOpenAt - now,
      canOpenNow: !isOpen && now >= nextOpenAt,
      openedTooSoon: last.openedTooSoon,
      itemCount: last.entries.length,
      occasionCount: occasions.length,
      mealWindowMs,
      minGapMs,
      idealGapMs,
    };
  }

  const dayStats = {
    occasionCount: occasions.length,
    tooSoonCount: occasions.filter(o => o.openedTooSoon).length,
    firstBiteAt: occasions.length ? new Date(occasions[0].openedAt) : null,
    lastBiteAt: occasions.length ? new Date(occasions[occasions.length - 1].lastBiteAt) : null,
    longestOccasionMs: occasions.reduce(
      (max, o) => Math.max(max, o.lastBiteAt - o.openedAt), 0
    ),
  };

  return { warnings, timingWarnings, occasions, mealWindow, dayStats };
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
