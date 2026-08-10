import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  getNutritionLog,
  getNutritionGoals,
  getDailySummaries,
  getWeightLog,
  logWeightForDate,
} from '../../utils/storage';
import { computeNextWeekTargets } from '../../utils/insulinUtils';

/** Returns the Sunday of the week containing the given date */
function getSundayOf(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // getDay() = 0 for Sunday
  return d.toISOString().split('T')[0];
}

/** Returns array of 7 date strings (Sun–Sat) for the week starting on sundayStr */
function getWeekDays(sundayStr) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sundayStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const today = () => new Date().toISOString().split('T')[0];

export default function WeeklySummaryView({ onApplyTargets }) {
  const goals = getNutritionGoals();
  const currentSunday = getSundayOf(today());

  const [weekStart, setWeekStart] = useState(currentSunday);
  const [weightInput, setWeightInput] = useState('');
  const [showRec, setShowRec] = useState(false);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const nutritionLog = useMemo(() => getNutritionLog(), [weekStart]);
  const dailySummaries = useMemo(() => getDailySummaries(), [weekStart]);
  const weightLog = useMemo(() => getWeightLog(), [weekStart, weightInput]);

  // Calories per day for this week
  const dailyCalories = useMemo(() => days.map(d => {
    const entries = nutritionLog[d] || [];
    return entries.reduce((s, e) => s + (e.calories || 0), 0);
  }), [days, nutritionLog]);

  // Avg daily calories (only days with any data)
  const daysWithData = dailyCalories.filter(c => c > 0);
  const avgDailyCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, c) => s + c, 0) / daysWithData.length)
    : 0;

  // Weekly deficit vs target
  const weeklyDeficit = daysWithData.length > 0
    ? (goals.calories - avgDailyCalories) * daysWithData.length
    : 0;

  // Weight entries for this week and previous Sunday
  const sundayWeight = weightLog.find(e => e.date === weekStart)?.weight ?? null;
  const prevSunday = (() => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();
  const prevSundayWeight = weightLog.find(e => e.date === prevSunday)?.weight ?? null;

  const weightChange = sundayWeight !== null && prevSundayWeight !== null
    ? +(sundayWeight - prevSundayWeight).toFixed(1)
    : null;

  // Next week targets
  const nextWeekTargets = useMemo(() => {
    if (daysWithData.length < 4) return null; // need at least 4 days of data
    return computeNextWeekTargets(goals, avgDailyCalories, prevSundayWeight, sundayWeight);
  }, [goals, avgDailyCalories, prevSundayWeight, sundayWeight, daysWithData.length]);

  const handleSaveWeight = () => {
    const w = parseFloat(weightInput);
    if (!w || w < 50) return;
    logWeightForDate(weekStart, w);
    setWeightInput('');
    setShowRec(false);
  };

  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
    setShowRec(false);
  };

  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    const next = d.toISOString().split('T')[0];
    if (next <= currentSunday) {
      setWeekStart(next);
      setShowRec(false);
    }
  };

  const isCurrentWeek = weekStart === currentSunday;
  const maxBarCal = Math.max(...dailyCalories, goals.calories, 500);

  const weekLabel = (() => {
    const start = new Date(weekStart + 'T12:00:00');
    const end = new Date(weekStart + 'T12:00:00');
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  })();

  return (
    <div className="space-y-4 pt-2">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-white">{weekLabel}</p>
          {isCurrentWeek && <p className="text-xs text-blue-400">Current week</p>}
        </div>
        <button onClick={nextWeek} className={`p-2 ${isCurrentWeek ? 'text-gray-700' : 'text-gray-400'}`} disabled={isCurrentWeek}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Daily calorie bars */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Daily Calories</p>
        <div className="flex items-end gap-1.5 h-24">
          {days.map((d, i) => {
            const cal = dailyCalories[i];
            const heightPct = cal > 0 ? Math.max(4, (cal / maxBarCal) * 100) : 0;
            const isToday = d === today();
            const isOver = cal > goals.calories * 1.05;
            const isUnder = cal > 0 && cal < goals.calories * 0.85;
            const hasSummary = !!dailySummaries[d];
            const barColor = cal === 0 ? 'bg-gray-800'
              : isOver ? 'bg-red-500/70'
              : isUnder ? 'bg-yellow-500/70'
              : 'bg-blue-500/70';
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-sm ${barColor} ${isToday ? 'ring-1 ring-white/30' : ''} relative`}
                    style={{ height: `${heightPct}%` }}
                  >
                    {hasSummary && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-400" />
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-600'}`}>
                  {DAY_LABELS[i]}
                </span>
                {cal > 0 && (
                  <span className="text-xs text-gray-500">{Math.round(cal / 100) * 100 >= 1000 ? `${(cal/1000).toFixed(1)}k` : cal}</span>
                )}
              </div>
            );
          })}
        </div>
        {/* Target line label */}
        <div className="flex items-center gap-2 mt-2">
          <div className="h-px flex-1 border-t border-dashed border-gray-700" />
          <span className="text-xs text-gray-600">target {goals.calories} cal</span>
          <div className="h-px flex-1 border-t border-dashed border-gray-700" />
        </div>
      </div>

      {/* Weekly stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
          <p className="text-xs text-gray-500 mb-1">Avg Daily</p>
          <p className="text-lg font-black text-white">{avgDailyCalories > 0 ? avgDailyCalories : '—'}</p>
          <p className="text-xs text-gray-600">cal / day ({daysWithData.length} days logged)</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
          <p className="text-xs text-gray-500 mb-1">Weekly Deficit</p>
          <p className={`text-lg font-black ${weeklyDeficit > 0 ? 'text-green-400' : weeklyDeficit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {weeklyDeficit !== 0 ? `${weeklyDeficit > 0 ? '+' : ''}${Math.round(weeklyDeficit)}` : '—'}
          </p>
          <p className="text-xs text-gray-600">cal vs target</p>
        </div>
      </div>

      {/* Sunday weigh-in */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-gray-400" />
          <p className="text-sm font-bold text-white">Sunday Weigh-In</p>
        </div>

        {sundayWeight !== null ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-white">{sundayWeight} <span className="text-sm text-gray-500 font-normal">lbs</span></p>
              {weightChange !== null && (
                <div className={`flex items-center gap-1 mt-1 text-sm font-semibold ${
                  weightChange < 0 ? 'text-green-400' : weightChange > 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {weightChange < 0 ? <TrendingDown size={14} /> : weightChange > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
                  {weightChange > 0 ? '+' : ''}{weightChange} lbs vs last week
                </div>
              )}
              {prevSundayWeight === null && (
                <p className="text-xs text-gray-600 mt-1">Log last Sunday's weight to see change</p>
              )}
            </div>
            <button
              onClick={() => { setWeightInput(String(sundayWeight)); }}
              className="text-xs text-blue-400 font-semibold"
            >
              Edit
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-2">Enter your weight for this Sunday</p>
        )}

        {(sundayWeight === null || weightInput !== '') && (
          <div className="flex gap-2 mt-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder="lbs"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              className="flex-1 bg-gray-800 text-white font-bold text-lg rounded-xl px-3 py-2.5 text-center placeholder-gray-600"
            />
            <button
              onClick={handleSaveWeight}
              className="bg-blue-600 text-white font-bold px-4 rounded-xl"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Next week recommendations */}
      {nextWeekTargets && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white">Next Week Targets</p>
            <button
              onClick={() => setShowRec(r => !r)}
              className="text-xs text-blue-400 font-semibold"
            >
              {showRec ? 'Hide' : 'Show'}
            </button>
          </div>

          {showRec && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed">{nextWeekTargets.reasoning}</p>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', value: nextWeekTargets.calories, unit: '', highlight: nextWeekTargets.adjustment !== 0 },
                  { label: 'Protein', value: nextWeekTargets.protein, unit: 'g', highlight: false },
                  { label: 'Carbs', value: nextWeekTargets.carbs, unit: 'g', highlight: nextWeekTargets.adjustment !== 0 },
                  { label: 'Fat', value: nextWeekTargets.fat, unit: 'g', highlight: false },
                ].map(({ label, value, unit, highlight }) => (
                  <div key={label} className={`rounded-xl p-2 text-center ${highlight ? 'bg-blue-900/40 border border-blue-700/40' : 'bg-gray-800'}`}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`font-bold text-sm ${highlight ? 'text-blue-300' : 'text-white'}`}>{value}{unit}</p>
                  </div>
                ))}
              </div>

              {nextWeekTargets.adjustment !== 0 && (
                <button
                  onClick={() => {
                    onApplyTargets(nextWeekTargets);
                    setShowRec(false);
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Apply These Targets
                </button>
              )}
              {nextWeekTargets.adjustment === 0 && (
                <p className="text-center text-xs text-green-400 font-semibold">✓ Current targets unchanged</p>
              )}
            </div>
          )}

          {!showRec && (
            <p className="text-xs text-gray-500">
              {nextWeekTargets.adjustment === 0
                ? '✓ On track — no adjustment needed'
                : `${nextWeekTargets.adjustment > 0 ? '+' : ''}${nextWeekTargets.adjustment} cal adjustment recommended`}
            </p>
          )}
        </div>
      )}

      {daysWithData.length < 4 && (
        <p className="text-xs text-gray-600 text-center">Log at least 4 days this week to unlock next-week recommendations</p>
      )}
    </div>
  );
}
