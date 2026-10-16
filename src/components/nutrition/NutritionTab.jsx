import { useState, useMemo, useRef, useEffect } from 'react';
import {
  getNutritionLog, saveNutritionEntry, updateNutritionEntry, deleteNutritionEntry,
  getSavedFoods, saveFood, deleteFood,
  getSavedMeals, saveMeal,
  getNutritionGoals, saveNutritionGoals,
  getWaterLog, addWaterEntry, deleteWaterEntry,
  getDailySummaries, saveDailySummary,
} from '../../utils/storage';
import {
  Plus, Minus, Trash2, X, Check, Loader, SlidersHorizontal, Pencil,
  Droplets, AlertTriangle, Clock, Camera, ChevronDown, ChevronUp, Utensils, Hourglass,
} from 'lucide-react';
import GoalsModal from './GoalsModal';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import SegmentedControl from '../ui/SegmentedControl';
import SyncStatus from '../ui/SyncStatus';
import WeeklySummaryView from './WeeklySummaryView';
import { analyzeNutritionDay, formatDuration, FOOD_CATEGORIES } from '../../utils/insulinUtils';

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
      <div className="sticky top-0 bg-floor z-10 px-4 pt-6 pb-3">
        <div className="flex items-end justify-between mb-1">
          <div>
            <SectionLabel>Nutrition</SectionLabel>
            <h1 className="font-display font-extrabold uppercase text-[40px] leading-none mt-1">Fuel</h1>
          </div>
          <Button variant="secondary" onClick={() => setShowGoals(true)} className="text-sm">
            <SlidersHorizontal size={16} />
            Goals
          </Button>
        </div>
        <SyncStatus className="mb-3" />
        <SegmentedControl
          options={[['today', 'Today'], ['library', 'Foods'], ['meals', 'Meals'], ['week', 'Week']]}
          value={view}
          onChange={setView}
        />
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

  // Tick every minute so the eating-window countdown stays live rather than
  // freezing at whatever it read when the last entry was logged.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const analysis = useMemo(
    () => analyzeNutritionDay(log, {
      mealWindowMs: (goals.mealWindowMinutes ?? 60) * 60 * 1000,
      minGapMs: (goals.mealGapHours ?? 2.5) * 60 * 60 * 1000,
      now: nowTick,
    }),
    [log, goals.mealWindowMinutes, goals.mealGapHours, nowTick]
  );

  const handleDelete = (entryId) => {
    deleteNutritionEntry(date, entryId);
    onUpdate();
  };

  // Rescales an entry's macros relative to its current quantity (defaulting old
  // entries with no quantity field to 1x), so repeated edits stay accurate
  // instead of compounding off whatever the last edit left behind.
  const handleUpdateQuantity = (entry, newQuantity) => {
    const prevQuantity = entry.quantity || 1;
    const scale = newQuantity / prevQuantity;
    updateNutritionEntry(date, entry.id, {
      quantity: newQuantity,
      calories: (entry.calories || 0) * scale,
      protein: (entry.protein || 0) * scale,
      carbs: (entry.carbs || 0) * scale,
      fat: (entry.fat || 0) * scale,
      waterOz: (entry.waterOz || 0) * scale,
    });
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

    // Describe timing with the same occasion model the banner uses, so the
    // summary and the UI can't disagree.
    const { dayStats } = analysis;
    const windowMin = goals.mealWindowMinutes ?? 60;
    const gapHrs = goals.mealGapHours ?? 2.5;
    const timingLine = dayStats.occasionCount === 0
      ? 'No eating occasions logged.'
      : [
          `Eating occasions: ${dayStats.occasionCount}`,
          `Opened too soon (under ${gapHrs} hrs rest): ${dayStats.tooSoonCount}`,
          `Longest occasion: ${Math.round(dayStats.longestOccasionMs / 60000)} min (target: close within ${windowMin} min)`,
          `First bite ${fmtTime(dayStats.firstBiteAt)}, last bite ${fmtTime(dayStats.lastBiteAt)}`,
        ].join('\n');

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
Meal timing (target: each eating window closes within ${windowMin} min, with ${gapHrs}+ hrs between windows so insulin returns to baseline):
${timingLine}

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
  const over = remainingCals < 0;

  // Calorie ring: 150px, 14px stroke
  const R = 68, C = 2 * Math.PI * R;
  const ringPct = target > 0 ? Math.min(totals.calories / target, 1) : 0;

  return (
    <div className="space-y-4 pt-1">
      {/* Calories + macros */}
      <section className="bg-bench border border-seam rounded-card p-4 flex items-center gap-4">
        <div className="relative w-[150px] h-[150px] flex-shrink-0">
          <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="75" cy="75" r={R} fill="none" stroke="#262320" strokeWidth="14" />
            <circle
              cx="75" cy="75" r={R} fill="none"
              stroke={over ? '#E8C468' : '#FF6B2C'} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - ringPct)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display font-extrabold text-4xl leading-none tabular-nums ${over ? 'text-brass' : 'text-chalk'}`}>
              {Math.round(Math.abs(remainingCals)).toLocaleString()}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-dust mt-1">{over ? 'over' : 'cal left'}</span>
            <span className="text-xs text-ash tabular-nums">{Math.round(totals.calories)} / {target}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <MacroBar label="Protein" value={totals.protein} target={goals.protein} color="bg-chalk" />
          <MacroBar label="Carbs" value={totals.carbs} target={goals.carbs} color="bg-brass" />
          <MacroBar label="Fat" value={totals.fat} target={goals.fat} color="bg-teal" />
        </div>
      </section>

      {/* Meal window status */}
      {analysis.mealWindow && <MealWindowBanner window={analysis.mealWindow} />}

      {/* Water tracker */}
      <WaterTracker
        totalOz={totalWaterOz}
        goal={goals.water ?? 100}
        standaloneEntries={waterEntries}
        foodWaterOz={totals.waterOz}
        onAdd={(oz) => { addWaterEntry(date, oz); onUpdate(); }}
        onDelete={(id) => { deleteWaterEntry(date, id); onUpdate(); }}
      />

      {/* Add food */}
      <Button onClick={() => setShowAdd(true)} className="w-full">
        <Plus size={20} strokeWidth={3} />
        Add food
      </Button>

      {/* Food log + day grade */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Today's log</SectionLabel>
          {existingSummary ? (
            <button onClick={() => setShowDaySummary(true)} className="min-h-[44px] px-1 text-sm font-semibold text-orange">
              Day grade: {existingSummary.grade}
            </button>
          ) : (
            <button
              onClick={handleCompleteDay}
              disabled={generatingSummary || log.length === 0}
              className="min-h-[44px] px-1 text-sm font-semibold text-orange flex items-center gap-1.5 disabled:opacity-40"
            >
              {generatingSummary && <Loader size={14} className="animate-spin" />}
              {generatingSummary ? 'Grading…' : 'Grade my day'}
            </button>
          )}
        </div>

        {log.length > 0 ? (
          <div className="bg-bench border border-seam rounded-card divide-y divide-seam overflow-hidden">
            {log.map((entry) => (
              <FoodLogItem
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                onUpdateQuantity={(qty) => handleUpdateQuantity(entry, qty)}
                timingWarning={analysis.timingWarnings[entry.id]}
                glycemicWarning={analysis.warnings[entry.id]}
              />
            ))}
          </div>
        ) : !showAdd && (
          <div className="text-center py-6 text-dust bg-bench border border-seam rounded-card">
            <p className="text-sm">No food logged yet today</p>
            <p className="text-xs mt-1 text-ash">Tap "Add food" to get started</p>
          </div>
        )}
      </section>

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

// ─── Meal Window Banner ──────────────────────────────────────────────────────

const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function MealWindowBanner({ window: w }) {
  // Three live states: window open (finish eating), resting (insulin settling),
  // or rested (free to open a new window).
  let Icon, headline, detail;

  if (w.isOpen) {
    Icon = Utensils;
    headline = `Window open — ${formatDuration(w.msUntilClose)} left`;
    detail = `Opened ${fmtTime(w.openedAt)} · close by ${fmtTime(w.closesAt)}`;
  } else if (w.canOpenNow) {
    Icon = Check;
    headline = 'Rested — ready for your next meal';
    detail = `Last bite ${fmtTime(w.lastBiteAt)}`;
  } else {
    Icon = Hourglass;
    headline = `Resting — ${formatDuration(w.msUntilNextOpen)} until you can eat`;
    detail = `Last bite ${fmtTime(w.lastBiteAt)} · next window ${fmtTime(w.nextOpenAt)}`;
  }

  return (
    <section className="bg-bench border border-seam rounded-tile px-4 py-3 flex items-start gap-3">
      <span className="w-10 h-10 rounded-input bg-brass-deep flex items-center justify-center flex-shrink-0">
        <Clock size={18} className="text-brass" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-chalk flex items-center gap-1.5">
          <Icon size={15} className="text-brass flex-shrink-0" />
          {headline}
        </p>
        <p className="text-sm text-dust mt-0.5">{detail}</p>
      </div>
    </section>
  );
}

// ─── Day Summary Modal ────────────────────────────────────────────────────────

const GRADE_COLORS = { A: 'text-teal', B: 'text-orange', C: 'text-brass', D: 'text-orange', F: 'text-orange' };

function DaySummaryModal({ summary, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
      <div className="bg-bench rounded-t-2xl p-5 w-full max-w-lg border-t border-seam max-h-[82vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-chalk">Day Summary</h2>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 flex items-center justify-center text-dust"><X size={22} className="text-dust" /></button>
        </div>

        {/* Grade */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-6xl font-black ${GRADE_COLORS[summary.grade] || 'text-chalk'}`}>
            {summary.grade}
          </div>
          <p className="text-sm text-chalk flex-1">{summary.headline}</p>
        </div>

        {/* Wins */}
        {summary.wins?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-teal uppercase tracking-wider mb-2">Wins</p>
            <div className="space-y-1.5">
              {summary.wins.map((w, i) => (
                <div key={i} className="flex items-start gap-2 bg-plate rounded-lg px-3 py-2">
                  <span className="text-teal mt-0.5">✓</span>
                  <p className="text-sm text-chalk">{w}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {summary.improvements?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-brass uppercase tracking-wider mb-2">Improve</p>
            <div className="space-y-1.5">
              {summary.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 bg-brass-deep rounded-lg px-3 py-2">
                  <span className="text-brass mt-0.5">→</span>
                  <p className="text-sm text-chalk">{imp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timing note */}
        {summary.timingNote && (
          <div className="mb-3 bg-orange-deep rounded-lg px-3 py-2.5 flex items-start gap-2">
            <Clock size={14} className="text-orange mt-0.5 flex-shrink-0" />
            <p className="text-sm text-chalk">{summary.timingNote}</p>
          </div>
        )}

        {/* Next day tip */}
        {summary.nextDayTip && (
          <div className="bg-plate rounded-xl px-4 py-3">
            <p className="text-xs text-dust font-semibold mb-1">Tomorrow's Focus</p>
            <p className="text-sm text-chalk">{summary.nextDayTip}</p>
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full bg-plate text-chalk font-semibold py-3 rounded-xl text-sm">
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
    <section className="bg-bench border border-seam rounded-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-input bg-plate flex items-center justify-center">
            <Droplets size={20} className="text-teal" />
          </span>
          <div>
            <SectionLabel>Water</SectionLabel>
            <p className="tabular-nums">
              <span className="font-display font-bold text-2xl text-chalk">{Math.round(totalOz)}</span>
              <span className="text-dust text-sm"> / {goal} oz</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {[16, 32].map(oz => (
            <Button key={oz} variant="secondary" onClick={() => onAdd(oz)} className="text-sm px-3 tabular-nums">
              +{oz} oz
            </Button>
          ))}
        </div>
      </div>

      <div className="h-2 bg-plate rounded-full overflow-hidden mt-3">
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
      {remaining > 0
        ? <p className="text-xs text-dust mt-2">{Math.round(remaining)} oz remaining today</p>
        : <p className="text-xs text-teal font-semibold mt-2 flex items-center gap-1"><Check size={13} /> Daily goal reached</p>
      }

      <div className="flex gap-2 mt-3">
        <input
          type="number" inputMode="decimal" placeholder="Custom oz" aria-label="Custom ounces"
          value={customOz} onChange={e => setCustomOz(e.target.value)}
          className="flex-1 min-w-0 h-11 bg-floor border border-seam rounded-input px-3 text-chalk font-semibold tabular-nums placeholder-ash"
        />
        <Button variant="secondary" onClick={handleCustomAdd} aria-label="Add custom ounces" className="px-3">
          <Plus size={18} />
        </Button>
      </div>

      {(standaloneEntries.length > 0 || foodWaterOz > 0) && (
        <div className="space-y-1.5 border-t border-seam pt-3 mt-3">
          {foodWaterOz > 0 && (
            <div className="flex items-center justify-between text-sm text-dust px-1">
              <span className="flex items-center gap-1.5"><Droplets size={13} className="text-teal" />From food & drinks</span>
              <span className="font-semibold text-chalk tabular-nums">{Math.round(foodWaterOz)} oz</span>
            </div>
          )}
          {standaloneEntries.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-plate rounded-xl pl-3 min-h-[44px]">
              <div className="flex items-center gap-2">
                <Droplets size={13} className="text-teal" />
                <span className="text-sm text-chalk font-semibold tabular-nums">{e.oz} oz</span>
                <span className="text-xs text-ash">
                  {new Date(e.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <button onClick={() => onDelete(e.id)} aria-label={`Delete ${e.oz} oz`} className="w-11 h-11 flex items-center justify-center text-ash">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-dust">{label}</span>
        <span className="text-sm text-chalk font-semibold tabular-nums">{Math.round(value)} / {target}g</span>
      </div>
      <div className="h-2 bg-plate rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CATEGORY_COLORS = {
  Meal: 'bg-orange-deep text-orange border-orange/40',
  Snack: 'bg-brass-deep text-brass border-brass-edge',
  Vitamins: 'bg-purple-900/40 text-purple-300 border-purple-800/40',
  Supplement: 'bg-plate text-teal border-teal/40',
  Other: 'bg-plate text-dust border-seam',
};

function FoodLogItem({ entry, onDelete, onUpdateQuantity, timingWarning, glycemicWarning }) {
  const [editingQty, setEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(entry.quantity || 1);

  const timeStr = entry.loggedAt
    ? new Date(entry.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  const openQtyEditor = () => {
    setQtyInput(entry.quantity || 1);
    setEditingQty(true);
  };

  const handleSaveQty = () => {
    onUpdateQuantity(Math.max(0.25, qtyInput));
    setEditingQty(false);
  };

  const macros = [
    entry.protein ? `P${Math.round(entry.protein)}` : null,
    entry.carbs ? `C${Math.round(entry.carbs)}` : null,
    entry.fat ? `F${Math.round(entry.fat)}` : null,
    entry.waterOz ? `${entry.waterOz} oz water` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => (editingQty ? setEditingQty(false) : openQtyEditor())}
        aria-expanded={editingQty}
        aria-label={`${entry.name}, ${Math.round(entry.calories || 0)} calories. Edit or delete`}
        className="w-full grid grid-cols-[3.75rem_1fr_auto] items-center gap-3 min-h-[44px] text-left"
      >
        <span className="text-xs text-ash tabular-nums leading-tight">{timeStr}</span>
        <div className="min-w-0">
          <p className="font-semibold text-chalk truncate">
            {entry.name}
            {entry.quantity && entry.quantity !== 1 && <span className="text-dust font-normal"> · {entry.quantity}×</span>}
          </p>
          <p className="text-xs text-dust tabular-nums truncate">
            {entry.category ? `${entry.category}${macros ? ' · ' : ''}` : ''}{macros}
          </p>
        </div>
        <span className="font-display font-bold text-xl text-chalk tabular-nums">{Math.round(entry.calories || 0)}</span>
      </button>

      {/* Inline quantity editor */}
      {editingQty && (
        <div className="mt-1 flex items-center justify-between bg-plate rounded-xl pl-3 pr-1 min-h-[52px]">
          <span className="text-sm text-dust font-semibold">Quantity</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQtyInput(q => Math.max(0.25, +(q - 0.5).toFixed(2)))}
              aria-label="Less"
              className="w-11 h-11 rounded-input bg-floor border border-seam text-chalk flex items-center justify-center"
            >
              <Minus size={16} />
            </button>
            <span className="text-chalk font-display font-bold text-xl w-12 text-center tabular-nums">{qtyInput}×</span>
            <button
              onClick={() => setQtyInput(q => +(q + 0.5).toFixed(2))}
              aria-label="More"
              className="w-11 h-11 rounded-input bg-floor border border-seam text-chalk flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
            <button onClick={handleSaveQty} aria-label="Save quantity" className="w-11 h-11 flex items-center justify-center text-teal"><Check size={18} /></button>
            <button onClick={() => setEditingQty(false)} aria-label="Cancel" className="w-11 h-11 flex items-center justify-center text-ash"><X size={18} /></button>
          </div>
        </div>
      )}
      {editingQty && (
        <button onClick={onDelete} className="mt-2 w-full min-h-[44px] rounded-input border border-seam text-dust text-sm font-semibold flex items-center justify-center gap-2 active:bg-plate">
          <Trash2 size={15} /> Delete {entry.name}
        </button>
      )}

      {/* Inline warnings */}
      {timingWarning && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-brass">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{timingWarning}</span>
        </div>
      )}
      {glycemicWarning && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-orange">
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
  const [quantity, setQuantity] = useState(1);
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
      calories: (parsed.calories || 0) * quantity,
      protein: (parsed.protein || 0) * quantity,
      carbs: (parsed.carbs || 0) * quantity,
      fat: (parsed.fat || 0) * quantity,
      waterOz: (parsed.waterOz || 0) * quantity,
      quantity,
      category: selectedCategory,
      loggedAt: new Date().toISOString(),
    });
  };

  const handleQuickAdd = (food) => {
    onSave({
      id: `entry_${Date.now()}`,
      ...food,
      waterOz: food.waterOz || 0,
      quantity: food.quantity || 1,
      category: food.category || 'Meal',
      loggedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
      <div className="bg-bench rounded-t-2xl p-5 w-full max-w-lg border-t border-seam max-h-[82vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Food</h2>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 flex items-center justify-center text-dust"><X size={22} className="text-dust" /></button>
        </div>

        {!apiKey && (
          <div className="mb-4">
            <label className="text-xs text-dust block mb-1">Anthropic API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..." aria-label="Anthropic API key" className="w-full h-11 bg-floor border border-seam text-chalk rounded-input px-3 text-sm placeholder-ash" />
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {[['text', 'Describe'], ['photo', 'Upload Label'], ['library', 'Saved Foods']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setParsed(null); setQuantity(1); setError(null); }}
              className={`flex-1 min-h-[44px] rounded-full text-sm font-semibold ${mode === m ? 'bg-orange text-floor' : 'bg-plate text-dust'}`}>
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
              className="w-full bg-plate text-chalk rounded-xl px-4 py-3 text-sm resize-none"
              rows={3} autoFocus
            />
            <button onClick={analyzeText} disabled={!text.trim() || !apiKey}
              className="w-full py-3 bg-orange text-floor rounded-xl font-bold text-sm disabled:opacity-50">
              Analyze with AI
            </button>
            {error && <p className="text-orange text-xs">{error}</p>}
          </div>
        )}

        {/* Photo mode — upload from library (no direct camera capture) */}
        {mode === 'photo' && !parsed && !loading && (
          <div className="space-y-3">
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-seam rounded-xl py-5 flex flex-col items-center gap-2 text-dust active:border-orange">
              <Camera size={24} />
              <span className="text-sm font-semibold text-dust">Upload photo of nutrition label</span>
              <span className="text-xs text-ash">Select from your photo library</span>
            </button>
            {/* No capture="environment" — uses photo library picker */}
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => { if (e.target.files?.[0]) analyzePhoto(e.target.files[0]); }}
              className="hidden" />
            {error && <p className="text-orange text-xs">{error}</p>}
          </div>
        )}

        {/* Library mode */}
        {mode === 'library' && (
          <div className="space-y-2">
            {savedFoods.length === 0 && (
              <p className="text-ash text-sm text-center py-6">No saved foods yet.</p>
            )}
            {savedFoods.map(food => (
              <button key={food.id} onClick={() => handleQuickAdd(food)}
                className="w-full bg-plate rounded-xl p-3 text-left flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-chalk text-sm">{food.name}</p>
                    {food.category && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[food.category] || CATEGORY_COLORS.Other}`}>
                        {food.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dust">
                    {food.calories}cal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
                    {food.waterOz ? ` · 💧${food.waterOz}oz` : ''}
                  </p>
                </div>
                <Plus size={18} className="text-orange flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader size={28} className="animate-spin text-orange" />
            <p className="text-sm text-dust">
              {mode === 'photo' ? 'Reading label...' : 'Analyzing nutrition...'}
            </p>
            {mode === 'photo' && (
              <p className="text-xs text-ash">Compressing & sending to AI</p>
            )}
          </div>
        )}

        {parsed && !loading && (
          <div className="space-y-4">
            <div className="bg-plate rounded-xl p-4">
              {/* Editable name */}
              <input
                type="text"
                value={parsed.name || ''}
                onChange={e => setParsed(p => ({ ...p, name: e.target.value }))}
                placeholder="Food name"
                className="w-full bg-seam text-chalk font-bold text-sm rounded-lg px-3 h-11 mb-2"
              />
              {parsed.servingDescription && <p className="text-xs text-dust mb-3">{parsed.servingDescription}</p>}

              {/* Quantity */}
              <div className="flex items-center justify-between bg-plate rounded-lg px-3 py-1 mb-2">
                <span className="text-xs text-dust font-semibold">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(0.25, +(q - 0.5).toFixed(2)))}
                    aria-label="Less"
                    className="w-11 h-11 rounded-full bg-floor border border-seam text-chalk flex items-center justify-center active:bg-plate"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-chalk font-bold text-sm w-10 text-center">{quantity}×</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => +(q + 0.5).toFixed(2))}
                    aria-label="More"
                    className="w-11 h-11 rounded-full bg-floor border border-seam text-chalk flex items-center justify-center active:bg-plate"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { label: 'Cal', value: parsed.calories, unit: '' },
                  { label: 'Protein', value: parsed.protein, unit: 'g' },
                  { label: 'Carbs', value: parsed.carbs, unit: 'g' },
                  { label: 'Fat', value: parsed.fat, unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="text-center bg-seam rounded-lg p-2">
                    <p className="text-xs text-dust">{label}</p>
                    <p className="font-bold text-chalk text-sm">{Math.round((value || 0) * quantity)}{unit}</p>
                  </div>
                ))}
              </div>
              {/* Editable water field */}
              <div className="flex items-center gap-2 bg-orange-deep border border-orange/40 rounded-lg px-3 py-2 mt-2">
                <Droplets size={14} className="text-orange flex-shrink-0" />
                <span className="text-xs text-orange font-semibold flex-1">Water (oz)</span>
                <input
                  type="number" inputMode="decimal"
                  value={parsed.waterOz ?? 0}
                  onChange={e => setParsed(p => ({ ...p, waterOz: parseFloat(e.target.value) || 0 }))}
                  className="w-16 bg-plate text-chalk text-sm font-bold rounded-lg px-2 h-11 text-center"
                />
              </div>
            </div>

            {/* Category picker */}
            <div>
              <p className="text-xs text-dust mb-2 font-semibold">Category</p>
              <div className="flex flex-wrap gap-2">
                {FOOD_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3 min-h-[44px] rounded-full text-xs font-semibold border transition-colors ${
                      selectedCategory === cat
                        ? (CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other) + ' ring-1 ring-white/20'
                        : 'bg-plate text-dust border-seam'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setParsed(null); setQuantity(1); setText(''); }} className="flex-1 py-3 bg-plate text-chalk rounded-xl font-semibold text-sm">
                Try Again
              </button>
              <button onClick={handleSave} className="flex-1 py-3 bg-teal text-floor rounded-xl font-bold text-sm flex items-center justify-center gap-1">
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
      <p className="text-xs text-dust">Foods are saved automatically when you log them.</p>
      {foods.length === 0 && <p className="text-ash text-sm text-center py-8">No saved foods yet</p>}
      {foods.map(food => (
        <div key={food.id} className="bg-bench rounded-xl border border-seam px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-chalk text-sm">{food.name}</p>
              {food.category && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[food.category] || CATEGORY_COLORS.Other}`}>
                  {food.category}
                </span>
              )}
            </div>
            <p className="text-xs text-dust">
              {food.calories}cal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
              {food.waterOz ? ` · 💧${food.waterOz}oz` : ''}
            </p>
          </div>
          <button onClick={() => handleDelete(food.id)} aria-label={`Delete ${food.name}`} className="w-11 h-11 flex items-center justify-center -mr-2 text-ash"><Trash2 size={16} /></button>
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
    // One shared timestamp for the whole meal — these foods were eaten together,
    // and logging them a few ms apart in the loop below previously made them look
    // like separate eating occasions to the grazing/eating-window analysis.
    const loggedAt = new Date().toISOString();
    meal.foods.forEach(food => {
      saveNutritionEntry(date, {
        id: `entry_${Date.now()}_${Math.random()}`,
        ...food,
        waterOz: food.waterOz || 0,
        quantity: food.quantity || 1,
        mealName: meal.name,
        loggedAt,
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
        className="w-full bg-plate border border-seam border-dashed text-dust font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
        <Plus size={18} /> Create Saved Meal
      </button>

      {meals.length === 0 && <p className="text-ash text-sm text-center py-6">No saved meals yet</p>}

      {meals.map(meal => (
        <div key={meal.id} className="bg-bench rounded-xl border border-seam p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-chalk">{meal.name}</p>
              <p className="text-xs text-dust">{meal.foods.length} foods · ~{Math.round(meal.totalCalories)} cal</p>
            </div>
            <button onClick={() => logMeal(meal)} className="bg-orange text-floor text-xs font-bold px-3 min-h-[44px] rounded-lg">Log</button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {meal.foods.map((f, i) => (
              <span key={i} className="bg-plate text-dust text-xs px-2 py-1 rounded-full">{f.name}</span>
            ))}
          </div>
        </div>
      ))}

      {showCreate && (
        <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
          <div className="bg-bench rounded-t-2xl p-5 w-full max-w-lg border-t border-seam max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Meal</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Close" className="w-11 h-11 flex items-center justify-center -mr-2 text-dust"><X size={22} /></button>
            </div>
            <input type="text" placeholder="Meal name (e.g. Breakfast)"
              value={newMealName} onChange={e => setNewMealName(e.target.value)}
              className="w-full bg-plate text-chalk rounded-xl px-4 py-3 text-sm mb-4" />
            <p className="text-xs text-dust mb-2">Select foods to include:</p>
            {savedFoods.length === 0 && <p className="text-xs text-ash text-center py-4">No saved foods yet</p>}
            <div className="space-y-2 mb-4">
              {savedFoods.map(food => {
                const selected = !!selectedFoods.find(f => f.id === food.id);
                return (
                  <button key={food.id} onClick={() => toggleFood(food)}
                    className={`w-full rounded-xl p-3 text-left flex items-center gap-3 ${selected ? 'bg-orange-deep border border-orange/40' : 'bg-plate'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-orange bg-orange' : 'border-seam'}`}>
                      {selected && <Check size={12} className="text-chalk" />}
                    </div>
                    <div>
                      <p className="font-semibold text-chalk text-sm">{food.name}</p>
                      <p className="text-xs text-dust">{food.calories}cal</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={handleCreateMeal} disabled={!newMealName.trim() || selectedFoods.length === 0}
              className="w-full bg-orange text-floor font-bold py-3 rounded-xl disabled:opacity-50">
              Save Meal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
