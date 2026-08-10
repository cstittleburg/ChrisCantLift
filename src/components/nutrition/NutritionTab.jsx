import { useState, useMemo, useRef } from 'react';
import {
  getNutritionLog, saveNutritionEntry, deleteNutritionEntry,
  getSavedFoods, saveFood, deleteFood,
  getSavedMeals, saveMeal,
  getNutritionGoals, saveNutritionGoals,
  getWaterLog, addWaterEntry, deleteWaterEntry,
  getDailySummaries, saveDailySummary,
} from '../../utils/storage';
import {
  Plus, Trash2, X, Check, Loader, SlidersHorizontal,
  Droplets, AlertTriangle, Clock, Camera, ChevronDown, ChevronUp,
} from 'lucide-react';
import GoalsModal from './GoalsModal';
import WeeklySummaryView from './WeeklySummaryView';
import { analyzeNutritionDay, FOOD_CATEGORIES } from '../../utils/insulinUtils';

const ANTHROPIC_KEY_STORAGE = 'fitness_anthropic_key';
const today = () => new Date().toISOString().split('T')[0];

/** Headers required for direct browser → Anthropic API calls */
function anthropicHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

const CLAUDE_MODEL = 'claude-sonnet-4-6';

/**
 * Resize + compress an image file using canvas before sending to Claude.
 * Reduces a typical 6MB phone photo to ~100–200KB while keeping label text readable.
 * Returns { base64: string, mediaType: 'image/jpeg' }
 */
async function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function useForceUpdate() {
  const [, setTick] = useState(0);
  return () => setTick(t => t + 1);
}

export default function NutritionTab() {
  const [date] = useState(today);
  const [view, setView] = useState('today'); // today | library | meals | week
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoals] = useState(() => getNutritionGoals());
  const forceUpdate = useForceUpdate();

  const log = useMemo(() => {
    const all = getNutritionLog();
    return (all[date] || []).sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));
  }, [date, forceUpdate]);

  const waterEntries = useMemo(() => {
    const all = getWaterLog();
    return all[date] || [];
  }, [date, forceUpdate]);

  const totals = useMemo(() => log.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0),
    fat: acc.fat + (e.fat || 0),
    waterOz: acc.waterOz + (e.waterOz || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, waterOz: 0 }), [log]);

  const totalWaterOz = waterEntries.reduce((s, e) => s + (e.oz || 0), 0) + totals.waterOz;
  const target = goals.calories;
  const pctCalories = Math.min((totals.calories / target) * 100, 100);

  const handleApplyTargets = (newTargets) => {
    saveNutritionGoals(newTargets);
    setGoals(newTargets);
  };

  return (
    <div className="pb-6">
      <div className="sticky top-0 bg-gray-950 z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-white">Nutrition</h1>
          <button
            onClick={() => setShowGoals(true)}
            className="flex items-center gap-1.5 bg-gray-800 text-gray-400 text-xs font-semibold px-3 py-2 rounded-full"
          >
            <SlidersHorizontal size={14} />
            Goals
          </button>
        </div>
        <div className="flex gap-1.5">
          {[['today', 'Today'], ['library', 'Foods'], ['meals', 'Meals'], ['week', 'Week']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                view === v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {view === 'today' && (
          <TodayView
            date={date}
            log={log}
            totals={totals}
            goals={goals}
            target={target}
            pctCalories={pctCalories}
            waterEntries={waterEntries}
            totalWaterOz={totalWaterOz}
            onUpdate={forceUpdate}
          />
        )}
        {view === 'library' && <FoodsLibrary onUpdate={forceUpdate} />}
        {view === 'meals' && <SavedMealsView date={date} onUpdate={forceUpdate} />}
        {view === 'week' && <WeeklySummaryView onApplyTargets={handleApplyTargets} />}
      </div>

      {showGoals && (
        <GoalsModal
          onClose={() => setShowGoals(false)}
          onSave={(newGoals) => setGoals(newGoals)}
        />
      )}
    </div>
  );
}

// ─── Today View ──────────────────────────────────────────────────────────────

function TodayView({ date, log, totals, goals, target, pctCalories, waterEntries, totalWaterOz, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const dailySummaries = getDailySummaries();
  const existingSummary = dailySummaries[date] || null;

  const analysis = useMemo(() => analyzeNutritionDay(log), [log]);

  const handleDelete = (entryId) => {
    deleteNutritionEntry(date, entryId);
    onUpdate();
  };

  const handleSaveEntry = (entry) => {
    saveNutritionEntry(date, entry);
    if (entry.calories > 0 && entry.category !== 'Vitamins' && entry.category !== 'Supplement') {
      const foods = getSavedFoods();
      if (!foods.find(f => f.name.toLowerCase() === entry.name.toLowerCase())) {
        saveFood({
          id: `food_${Date.now()}`,
          name: entry.name,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          waterOz: entry.waterOz || 0,
          category: entry.category || 'Meal',
        });
      }
    }
    setShowAdd(false);
    onUpdate();
  };

  const handleCompleteDay = async () => {
    const apiKey = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
    if (!apiKey) {
      alert('Add your Anthropic API key via Add Food first.');
      return;
    }
    setGeneratingSummary(true);

    const entryLines = log.map(e => {
      const time = new Date(e.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${time} [${e.category || 'Meal'}] ${e.name}: ${Math.round(e.calories || 0)} cal, P${Math.round(e.protein || 0)}g, C${Math.round(e.carbs || 0)}g, F${Math.round(e.fat || 0)}g${e.waterOz ? `, ${e.waterOz}oz water` : ''}`;
    }).join('\n');

    const firstEntry = log[0] ? new Date(log[0].loggedAt) : null;
    const lastEntry = log[log.length - 1] ? new Date(log[log.length - 1].loggedAt) : null;
    const windowHours = firstEntry && lastEntry
      ? +((lastEntry - firstEntry) / 3600000).toFixed(1)
      : null;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders(apiKey),
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Analyze this nutrition day for a 41-year-old male focused on body recomposition (building muscle, losing fat). He is trying to avoid chronic insulin elevation and grazing.

Food log (chronological):
${entryLines || 'No entries logged.'}

Totals: ${Math.round(totals.calories)} cal / P${Math.round(totals.protein)}g / C${Math.round(totals.carbs)}g / F${Math.round(totals.fat)}g / ${Math.round(totalWaterOz)}oz water
Goals: ${goals.calories} cal / P${goals.protein}g / C${goals.carbs}g / F${goals.fat}g / ${goals.water ?? 100}oz water
Eating window: ${windowHours !== null ? `${windowHours} hours` : 'unknown'}

Return ONLY valid JSON — no other text:
{"grade":"A","headline":"One sentence overall take","wins":["win1","win2"],"improvements":["area1","area2"],"timingNote":"Specific observation about meal timing or insulin","nextDayTip":"One concrete thing to do differently tomorrow"}

Grade scale: A=excellent, B=good, C=average, D=needs work, F=poor.`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = { ...JSON.parse(jsonMatch[0]), completedAt: new Date().toISOString() };
        saveDailySummary(date, summary);
        setShowDaySummary(true);
        onUpdate();
      }
    } catch (e) {
      alert('Summary failed: ' + e.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const remainingCals = target - totals.calories;

  return (
    <div className="space-y-4">
      {/* Daily summary card */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Calories</p>
            <p className="text-3xl font-black text-white">{Math.round(totals.calories)}</p>
            <p className={`text-sm font-semibold ${remainingCals >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {remainingCals >= 0 ? `${Math.round(remainingCals)} remaining` : `${Math.round(Math.abs(remainingCals))} over`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Target</p>
            <p className="text-xl font-bold text-gray-300">{target}</p>
          </div>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pctCalories >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${pctCalories}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <MacroBar label="Protein" value={totals.protein} target={goals.protein} unit="g" color="bg-blue-500" />
          <MacroBar label="Carbs" value={totals.carbs} target={goals.carbs} unit="g" color="bg-yellow-500" />
          <MacroBar label="Fat" value={totals.fat} target={goals.fat} unit="g" color="bg-orange-500" />
        </div>
      </div>

      {/* Eating window banner */}
      {analysis.eatingWindow && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${
          analysis.eatingWindow.isGood
            ? 'bg-green-900/30 border border-green-800/40 text-green-400'
            : 'bg-yellow-900/30 border border-yellow-800/40 text-yellow-400'
        }`}>
          <Clock size={13} className="flex-shrink-0" />
          <span>
            {analysis.eatingWindow.isGood ? '✓' : '⚠'} Eating window: {analysis.eatingWindow.hours} hrs
            {' '}({analysis.eatingWindow.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {analysis.eatingWindow.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})
            {!analysis.eatingWindow.isGood && ' — aim for ≤10 hrs'}
          </span>
        </div>
      )}

      {/* Next meal recommendation */}
      {analysis.nextMealRec && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-900/20 border border-blue-800/30 text-blue-300">
          <Clock size={13} className="flex-shrink-0" />
          {analysis.nextMealRec.message}
        </div>
      )}

      {/* Add food button */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Food / Drink
      </button>

      {/* Food log */}
      {log.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's Log</h3>
          {log.map((entry, i) => {
            const hasGrazeWarning = analysis.grazingPairs.has(entry.id);
            const hasGlycemicWarning = analysis.warnings[entry.id];
            return (
              <FoodLogItem
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                grazingWarning={hasGrazeWarning}
                glycemicWarning={hasGlycemicWarning}
              />
            );
          })}
        </div>
      )}

      {log.length === 0 && !showAdd && (
        <div className="text-center py-6 text-gray-600">
          <p className="text-sm">No food logged yet today</p>
          <p className="text-xs mt-1">Tap "Add Food" to get started</p>
        </div>
      )}

      {/* Water tracker */}
      <WaterTracker
        totalOz={totalWaterOz}
        goal={goals.water ?? 100}
        standaloneEntries={waterEntries}
        foodWaterOz={totals.waterOz}
        onAdd={(oz) => { addWaterEntry(date, oz); onUpdate(); }}
        onDelete={(id) => { deleteWaterEntry(date, id); onUpdate(); }}
      />

      {/* Complete Day */}
      <div className="pt-2 border-t border-gray-800">
        {existingSummary && !showDaySummary ? (
          <button
            onClick={() => setShowDaySummary(true)}
            className="w-full bg-gray-800 text-gray-300 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            View Day Summary (Grade: {existingSummary.grade})
          </button>
        ) : (
          <button
            onClick={handleCompleteDay}
            disabled={generatingSummary || log.length === 0}
            className="w-full bg-green-700 active:bg-green-800 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generatingSummary ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
            {generatingSummary ? 'Generating summary...' : 'Complete Day & Get AI Summary'}
          </button>
        )}
      </div>

      {/* Day summary modal */}
      {showDaySummary && existingSummary && (
        <DaySummaryModal summary={existingSummary} onClose={() => setShowDaySummary(false)} />
      )}

      {/* Add food modal */}
      {showAdd && (
        <AddFoodModal
          date={date}
          onSave={handleSaveEntry}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Day Summary Modal ────────────────────────────────────────────────────────

const GRADE_COLORS = { A: 'text-green-400', B: 'text-blue-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400' };

function DaySummaryModal({ summary, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
      <div className="bg-gray-900 rounded-t-2xl p-5 w-full max-w-lg border-t border-gray-700 max-h-[82vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Day Summary</h2>
          <button onClick={onClose}><X size={22} className="text-gray-500" /></button>
        </div>

        {/* Grade */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-6xl font-black ${GRADE_COLORS[summary.grade] || 'text-white'}`}>
            {summary.grade}
          </div>
          <p className="text-sm text-gray-300 flex-1">{summary.headline}</p>
        </div>

        {/* Wins */}
        {summary.wins?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Wins</p>
            <div className="space-y-1.5">
              {summary.wins.map((w, i) => (
                <div key={i} className="flex items-start gap-2 bg-green-900/20 rounded-lg px-3 py-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <p className="text-sm text-gray-300">{w}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {summary.improvements?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Improve</p>
            <div className="space-y-1.5">
              {summary.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 bg-yellow-900/20 rounded-lg px-3 py-2">
                  <span className="text-yellow-400 mt-0.5">→</span>
                  <p className="text-sm text-gray-300">{imp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timing note */}
        {summary.timingNote && (
          <div className="mb-3 bg-blue-900/20 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <Clock size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-300">{summary.timingNote}</p>
          </div>
        )}

        {/* Next day tip */}
        {summary.nextDayTip && (
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 font-semibold mb-1">Tomorrow's Focus</p>
            <p className="text-sm text-white">{summary.nextDayTip}</p>
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full bg-gray-800 text-gray-300 font-semibold py-3 rounded-xl text-sm">
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Water Tracker ────────────────────────────────────────────────────────────

function WaterTracker({ totalOz, goal, standaloneEntries, foodWaterOz, onAdd, onDelete }) {
  const [customOz, setCustomOz] = useState('');
  const pct = Math.min((totalOz / goal) * 100, 100);
  const remaining = Math.max(0, goal - totalOz);

  const handleCustomAdd = () => {
    const oz = parseFloat(customOz);
    if (!oz || oz <= 0) return;
    onAdd(oz);
    setCustomOz('');
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-blue-400" />
          <span className="text-sm font-bold text-white">Water</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-blue-400">{Math.round(totalOz)}</span>
          <span className="text-gray-500 text-sm font-semibold"> / {goal} oz</span>
        </div>
      </div>

      <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {remaining > 0
        ? <p className="text-xs text-gray-500 mb-3">{Math.round(remaining)} oz remaining today</p>
        : <p className="text-xs text-green-400 font-semibold mb-3">✓ Daily goal reached!</p>
      }

      <div className="flex gap-2 mb-3">
        {[8, 16, 20].map(oz => (
          <button key={oz} onClick={() => onAdd(oz)}
            className="flex-1 bg-blue-900/40 border border-blue-800/50 text-blue-300 text-sm font-bold py-2 rounded-xl active:bg-blue-800/50">
            +{oz}oz
          </button>
        ))}
        <div className="flex-1 flex gap-1">
          <input
            type="number" inputMode="decimal" placeholder="oz"
            value={customOz} onChange={e => setCustomOz(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm font-bold rounded-xl px-2 py-2 text-center placeholder-gray-600"
          />
          <button onClick={handleCustomAdd} className="bg-gray-700 text-white px-2 rounded-xl active:bg-gray-600">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {(standaloneEntries.length > 0 || foodWaterOz > 0) && (
        <div className="space-y-1 border-t border-gray-800 pt-3">
          {foodWaterOz > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span className="flex items-center gap-1.5"><Droplets size={12} className="text-blue-500" />From food & drinks</span>
              <span className="font-semibold text-blue-400">{Math.round(foodWaterOz)} oz</span>
            </div>
          )}
          {standaloneEntries.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Droplets size={12} className="text-blue-400" />
                <span className="text-sm text-white font-semibold">{e.oz} oz</span>
                <span className="text-xs text-gray-600">
                  {new Date(e.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <button onClick={() => onDelete(e.id)} className="text-gray-600 p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MacroBar({ label, value, target, unit, color }) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-300 font-semibold">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-600 mt-0.5">/{target}{unit}</p>
    </div>
  );
}

const CATEGORY_COLORS = {
  Meal: 'bg-blue-900/40 text-blue-300 border-blue-800/40',
  Snack: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/40',
  Vitamins: 'bg-purple-900/40 text-purple-300 border-purple-800/40',
  Supplement: 'bg-green-900/40 text-green-300 border-green-800/40',
  Other: 'bg-gray-800 text-gray-400 border-gray-700',
};

function FoodLogItem({ entry, onDelete, grazingWarning, glycemicWarning }) {
  const timeStr = entry.loggedAt
    ? new Date(entry.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  const catStyle = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.Other;
  const hasWarning = grazingWarning || glycemicWarning;

  return (
    <div className={`bg-gray-900 rounded-xl border px-4 py-3 ${hasWarning ? 'border-yellow-800/50' : 'border-gray-800'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {entry.category && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${catStyle}`}>
                {entry.category}
              </span>
            )}
            {timeStr && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock size={10} />
                {timeStr}
              </span>
            )}
          </div>
          <p className="font-semibold text-white text-sm truncate">{entry.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {entry.calories ? `${Math.round(entry.calories)} cal` : ''}
            {entry.protein ? ` · P${Math.round(entry.protein)}g` : ''}
            {entry.carbs ? ` · C${Math.round(entry.carbs)}g` : ''}
            {entry.fat ? ` · F${Math.round(entry.fat)}g` : ''}
            {entry.waterOz ? ` · 💧${entry.waterOz}oz` : ''}
          </p>
        </div>
        <button onClick={onDelete} className="text-gray-600 p-1 ml-2 flex-shrink-0"><Trash2 size={16} /></button>
      </div>

      {/* Inline warnings */}
      {grazingWarning && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-yellow-400">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>Short gap since last meal — frequent eating keeps insulin elevated</span>
        </div>
      )}
      {glycemicWarning && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-orange-400">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{glycemicWarning}</span>
        </div>
      )}
    </div>
  );
}

// ─── Add Food Modal ──────────────────────────────────────────────────────────

function AddFoodModal({ date, onSave, onClose }) {
  const [mode, setMode] = useState('text'); // text | photo | library
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Meal');
  const fileRef = useRef(null);
  const savedFoods = getSavedFoods();

  const analyzeText = async () => {
    if (!text.trim()) return;
    if (!apiKey) { setError('Enter your Anthropic API key above first'); return; }
    setLoading(true); setError(null);
    localStorage.setItem(ANTHROPIC_KEY_STORAGE, apiKey);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders(apiKey),
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `Estimate the nutrition for this food/drink: "${text}"

Return ONLY valid JSON, no other text:
{"name":"food name","calories":number,"protein":number,"carbs":number,"fat":number,"waterOz":number,"servingDescription":"what this represents"}

waterOz = fluid ounces of water in this item (e.g. 22 for a 22oz protein shake, 8 for a cup of water, 0 for solid food).`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const match = data.content[0].text.match(/\{[\s\S]*\}/);
      if (match) setParsed(JSON.parse(match[0]));
      else throw new Error('Could not parse response');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const analyzePhoto = async (file) => {
    if (!apiKey) { setError('Enter your Anthropic API key above first'); return; }
    setLoading(true); setError(null);
    localStorage.setItem(ANTHROPIC_KEY_STORAGE, apiKey);
    try {
      // Compress before sending — phone photos are 4–8MB, Claude needs <5MB
      const { base64, mediaType } = await compressImage(file);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders(apiKey),
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `This is a nutrition label or food photo. Extract the nutrition facts.

Return ONLY valid JSON, no other text:
{"name":"product name","calories":number,"protein":number,"carbs":number,"fat":number,"waterOz":number,"servingDescription":"serving size"}

waterOz = fluid ounces of water (e.g. 22 for a 22oz drink, 0 for solid food). Use per-serving values.` },
            ],
          }],
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const match = data.content[0].text.match(/\{[\s\S]*\}/);
      if (match) setParsed(JSON.parse(match[0]));
      else throw new Error('Could not parse label');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSave = () => {
    if (!parsed) return;
    onSave({
      id: `entry_${Date.now()}`,
      ...parsed,
      waterOz: parsed.waterOz || 0,
      category: selectedCategory,
      loggedAt: new Date().toISOString(),
    });
  };

  const handleQuickAdd = (food) => {
    onSave({
      id: `entry_${Date.now()}`,
      ...food,
      waterOz: food.waterOz || 0,
      category: food.category || 'Meal',
      loggedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
      <div className="bg-gray-900 rounded-t-2xl p-5 w-full max-w-lg border-t border-gray-700 max-h-[82vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Food</h2>
          <button onClick={onClose}><X size={22} className="text-gray-500" /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">
            Anthropic API Key {apiKey && <span className="text-green-500">✓ saved</span>}
          </label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..." className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-2 mb-4">
          {[['text', 'Describe'], ['photo', 'Upload Label'], ['library', 'Saved Foods']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setParsed(null); setError(null); }}
              className={`flex-1 py-2 rounded-full text-xs font-semibold ${mode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Text mode */}
        {mode === 'text' && !parsed && !loading && (
          <div className="space-y-3">
            <textarea
              placeholder="e.g. '2 eggs, cup of oatmeal' or '22oz protein shake 2 scoops'"
              value={text} onChange={e => setText(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm resize-none"
              rows={3} autoFocus
            />
            <button onClick={analyzeText} disabled={!text.trim() || !apiKey}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              Analyze with AI
            </button>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        )}

        {/* Photo mode — upload from library (no direct camera capture) */}
        {mode === 'photo' && !parsed && !loading && (
          <div className="space-y-3">
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 rounded-xl py-5 flex flex-col items-center gap-2 text-gray-500 active:border-blue-700">
              <Camera size={24} />
              <span className="text-sm font-semibold text-gray-400">Upload photo of nutrition label</span>
              <span className="text-xs text-gray-600">Select from your photo library</span>
            </button>
            {/* No capture="environment" — uses photo library picker */}
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => { if (e.target.files?.[0]) analyzePhoto(e.target.files[0]); }}
              className="hidden" />
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        )}

        {/* Library mode */}
        {mode === 'library' && (
          <div className="space-y-2">
            {savedFoods.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-6">No saved foods yet.</p>
            )}
            {savedFoods.map(food => (
              <button key={food.id} onClick={() => handleQuickAdd(food)}
                className="w-full bg-gray-800 rounded-xl p-3 text-left flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white text-sm">{food.name}</p>
                    {food.category && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[food.category] || CATEGORY_COLORS.Other}`}>
                        {food.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {food.calories}cal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
                    {food.waterOz ? ` · 💧${food.waterOz}oz` : ''}
                  </p>
                </div>
                <Plus size={18} className="text-blue-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader size={28} className="animate-spin text-blue-400" />
            <p className="text-sm text-gray-400">
              {mode === 'photo' ? 'Reading label...' : 'Analyzing nutrition...'}
            </p>
            {mode === 'photo' && (
              <p className="text-xs text-gray-600">Compressing & sending to AI</p>
            )}
          </div>
        )}

        {parsed && !loading && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              {/* Editable name */}
              <input
                type="text"
                value={parsed.name || ''}
                onChange={e => setParsed(p => ({ ...p, name: e.target.value }))}
                placeholder="Food name"
                className="w-full bg-gray-700 text-white font-bold text-sm rounded-lg px-3 py-2 mb-2"
              />
              {parsed.servingDescription && <p className="text-xs text-gray-500 mb-3">{parsed.servingDescription}</p>}
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { label: 'Cal', value: parsed.calories, unit: '' },
                  { label: 'Protein', value: parsed.protein, unit: 'g' },
                  { label: 'Carbs', value: parsed.carbs, unit: 'g' },
                  { label: 'Fat', value: parsed.fat, unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="text-center bg-gray-700 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-bold text-white text-sm">{Math.round(value || 0)}{unit}</p>
                  </div>
                ))}
              </div>
              {/* Editable water field */}
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-800/40 rounded-lg px-3 py-2 mt-2">
                <Droplets size={14} className="text-blue-400 flex-shrink-0" />
                <span className="text-xs text-blue-300 font-semibold flex-1">Water (oz)</span>
                <input
                  type="number" inputMode="decimal"
                  value={parsed.waterOz ?? 0}
                  onChange={e => setParsed(p => ({ ...p, waterOz: parseFloat(e.target.value) || 0 }))}
                  className="w-16 bg-gray-800 text-white text-sm font-bold rounded-lg px-2 py-1 text-center"
                />
              </div>
            </div>

            {/* Category picker */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-semibold">Category</p>
              <div className="flex flex-wrap gap-2">
                {FOOD_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      selectedCategory === cat
                        ? (CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other) + ' ring-1 ring-white/20'
                        : 'bg-gray-800 text-gray-500 border-gray-700'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setParsed(null); setText(''); }} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold text-sm">
                Try Again
              </button>
              <button onClick={handleSave} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1">
                <Check size={16} /> Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Foods Library ───────────────────────────────────────────────────────────

function FoodsLibrary({ onUpdate }) {
  const [foods, setFoods] = useState(() => getSavedFoods());

  const handleDelete = (id) => {
    deleteFood(id);
    setFoods(getSavedFoods());
    onUpdate();
  };

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-gray-500">Foods are saved automatically when you log them.</p>
      {foods.length === 0 && <p className="text-gray-600 text-sm text-center py-8">No saved foods yet</p>}
      {foods.map(food => (
        <div key={food.id} className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm">{food.name}</p>
              {food.category && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[food.category] || CATEGORY_COLORS.Other}`}>
                  {food.category}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {food.calories}cal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
              {food.waterOz ? ` · 💧${food.waterOz}oz` : ''}
            </p>
          </div>
          <button onClick={() => handleDelete(food.id)} className="text-gray-600 p-1"><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Saved Meals ─────────────────────────────────────────────────────────────

function SavedMealsView({ date, onUpdate }) {
  const [meals, setMeals] = useState(() => getSavedMeals());
  const [showCreate, setShowCreate] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [selectedFoods, setSelectedFoods] = useState([]);
  const savedFoods = getSavedFoods();

  const logMeal = (meal) => {
    meal.foods.forEach(food => {
      saveNutritionEntry(date, {
        id: `entry_${Date.now()}_${Math.random()}`,
        ...food,
        waterOz: food.waterOz || 0,
        mealName: meal.name,
        loggedAt: new Date().toISOString(),
      });
    });
    onUpdate();
  };

  const handleCreateMeal = () => {
    if (!newMealName.trim() || selectedFoods.length === 0) return;
    const meal = {
      id: `meal_${Date.now()}`,
      name: newMealName.trim(),
      foods: selectedFoods,
      totalCalories: selectedFoods.reduce((s, f) => s + (f.calories || 0), 0),
    };
    saveMeal(meal);
    setMeals(getSavedMeals());
    setShowCreate(false);
    setNewMealName('');
    setSelectedFoods([]);
  };

  const toggleFood = (food) => {
    setSelectedFoods(prev =>
      prev.find(f => f.id === food.id) ? prev.filter(f => f.id !== food.id) : [...prev, food]
    );
  };

  return (
    <div className="space-y-4 pt-2">
      <button onClick={() => setShowCreate(true)}
        className="w-full bg-gray-800 border border-gray-700 border-dashed text-gray-400 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
        <Plus size={18} /> Create Saved Meal
      </button>

      {meals.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No saved meals yet</p>}

      {meals.map(meal => (
        <div key={meal.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-white">{meal.name}</p>
              <p className="text-xs text-gray-500">{meal.foods.length} foods · ~{Math.round(meal.totalCalories)} cal</p>
            </div>
            <button onClick={() => logMeal(meal)} className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Log</button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {meal.foods.map((f, i) => (
              <span key={i} className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">{f.name}</span>
            ))}
          </div>
        </div>
      ))}

      {showCreate && (
        <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
          <div className="bg-gray-900 rounded-t-2xl p-5 w-full max-w-lg border-t border-gray-700 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Meal</h2>
              <button onClick={() => setShowCreate(false)}><X size={22} className="text-gray-500" /></button>
            </div>
            <input type="text" placeholder="Meal name (e.g. Breakfast)"
              value={newMealName} onChange={e => setNewMealName(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm mb-4" />
            <p className="text-xs text-gray-500 mb-2">Select foods to include:</p>
            {savedFoods.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No saved foods yet</p>}
            <div className="space-y-2 mb-4">
              {savedFoods.map(food => {
                const selected = !!selectedFoods.find(f => f.id === food.id);
                return (
                  <button key={food.id} onClick={() => toggleFood(food)}
                    className={`w-full rounded-xl p-3 text-left flex items-center gap-3 ${selected ? 'bg-blue-900/40 border border-blue-700/50' : 'bg-gray-800'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-blue-400 bg-blue-400' : 'border-gray-600'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{food.name}</p>
                      <p className="text-xs text-gray-500">{food.calories}cal</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={handleCreateMeal} disabled={!newMealName.trim() || selectedFoods.length === 0}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
              Save Meal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
