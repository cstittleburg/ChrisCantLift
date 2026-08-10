import { useState } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { getNutritionGoals, saveNutritionGoals } from '../../utils/storage';

// Calorie density per gram
const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

// Derive % from grams + calorie target
function gramsToPercents(calories, protein, carbs, fat) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return { proteinPct: 33, carbsPct: 34, fatPct: 33 };
  return {
    proteinPct: Math.round((protein * 4 / total) * 100),
    carbsPct: Math.round((carbs * 4 / total) * 100),
    fatPct: Math.round((fat * 9 / total) * 100),
  };
}

// Derive grams from % + calorie target
function percentsToGrams(calories, proteinPct, carbsPct, fatPct) {
  return {
    protein: Math.round((calories * proteinPct / 100) / CAL_PER_G.protein),
    carbs: Math.round((calories * carbsPct / 100) / CAL_PER_G.carbs),
    fat: Math.round((calories * fatPct / 100) / CAL_PER_G.fat),
  };
}

const DEFAULT_GOALS = { calories: 2809, protein: 200, carbs: 250, fat: 78, water: 100 };

export default function GoalsModal({ onClose, onSave }) {
  const saved = getNutritionGoals();

  const [calories, setCalories] = useState(saved.calories);
  const [protein, setProtein] = useState(saved.protein);
  const [carbs, setCarbs] = useState(saved.carbs);
  const [fat, setFat] = useState(saved.fat);
  const [water, setWater] = useState(saved.water ?? 100);
  const [mode, setMode] = useState('grams'); // 'grams' | 'percent'

  // Live % display (always derived from current grams)
  const pcts = gramsToPercents(calories, protein, carbs, fat);
  const totalPct = pcts.proteinPct + pcts.carbsPct + pcts.fatPct;
  const calFromMacros = protein * 4 + carbs * 4 + fat * 9;

  // ── Handlers: % mode ─────────────────────────────────────────────────────
  // When user changes one %, redistribute the remaining 100% between the other two proportionally
  const handlePctChange = (macro, newPct) => {
    newPct = Math.max(0, Math.min(100, Number(newPct)));
    const remaining = 100 - newPct;

    let pProtein = pcts.proteinPct;
    let pCarbs = pcts.carbsPct;
    let pFat = pcts.fatPct;

    if (macro === 'protein') {
      const others = pCarbs + pFat || 1;
      pProtein = newPct;
      pCarbs = Math.round((pCarbs / others) * remaining);
      pFat = 100 - pProtein - pCarbs;
    } else if (macro === 'carbs') {
      const others = pProtein + pFat || 1;
      pCarbs = newPct;
      pProtein = Math.round((pProtein / others) * remaining);
      pFat = 100 - pCarbs - pProtein;
    } else {
      const others = pProtein + pCarbs || 1;
      pFat = newPct;
      pProtein = Math.round((pProtein / others) * remaining);
      pCarbs = 100 - pFat - pProtein;
    }

    const g = percentsToGrams(calories, pProtein, pCarbs, pFat);
    setProtein(g.protein);
    setCarbs(g.carbs);
    setFat(g.fat);
  };

  // ── Handlers: gram mode ───────────────────────────────────────────────────
  // When user changes one macro's grams, the other two scale proportionally
  // to fill remaining calories
  const handleGramChange = (macro, newVal) => {
    newVal = Math.max(0, Number(newVal));
    const calUsed = newVal * CAL_PER_G[macro];
    const calLeft = Math.max(0, calories - calUsed);

    if (macro === 'protein') {
      const otherTotal = carbs * 4 + fat * 9 || 1;
      const newCarbs = Math.round((carbs * 4 / otherTotal) * calLeft / 4);
      const newFat = Math.round((fat * 9 / otherTotal) * calLeft / 9);
      setProtein(newVal);
      setCarbs(newCarbs);
      setFat(newFat);
    } else if (macro === 'carbs') {
      const otherTotal = protein * 4 + fat * 9 || 1;
      const newProtein = Math.round((protein * 4 / otherTotal) * calLeft / 4);
      const newFat = Math.round((fat * 9 / otherTotal) * calLeft / 9);
      setCarbs(newVal);
      setProtein(newProtein);
      setFat(newFat);
    } else {
      const otherTotal = protein * 4 + carbs * 4 || 1;
      const newProtein = Math.round((protein * 4 / otherTotal) * calLeft / 4);
      const newCarbs = Math.round((carbs * 4 / otherTotal) * calLeft / 4);
      setFat(newVal);
      setProtein(newProtein);
      setCarbs(newCarbs);
    }
  };

  // When calorie target changes, keep % split constant, recompute grams
  const handleCaloriesChange = (newCal) => {
    newCal = Math.max(500, Number(newCal));
    setCalories(newCal);
    const g = percentsToGrams(newCal, pcts.proteinPct, pcts.carbsPct, pcts.fatPct);
    setProtein(g.protein);
    setCarbs(g.carbs);
    setFat(g.fat);
  };

  const handleSave = () => {
    const goals = { calories, protein, carbs, fat, water };
    saveNutritionGoals(goals);
    onSave(goals);
    onClose();
  };

  const handleReset = () => {
    setCalories(DEFAULT_GOALS.calories);
    setProtein(DEFAULT_GOALS.protein);
    setCarbs(DEFAULT_GOALS.carbs);
    setFat(DEFAULT_GOALS.fat);
    setWater(DEFAULT_GOALS.water);
  };

  const macros = [
    { key: 'protein', label: 'Protein', color: 'text-blue-400', bar: 'bg-blue-500', value: protein, pct: pcts.proteinPct, setter: setProtein },
    { key: 'carbs',   label: 'Carbs',   color: 'text-yellow-400', bar: 'bg-yellow-500', value: carbs, pct: pcts.carbsPct, setter: setCarbs },
    { key: 'fat',     label: 'Fat',     color: 'text-orange-400', bar: 'bg-orange-500', value: fat, pct: pcts.fatPct, setter: setFat },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-[60]">
      <div className="bg-gray-900 rounded-t-2xl w-full max-w-lg border-t border-gray-700 max-h-[82vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Nutrition Goals</h2>
          <div className="flex gap-2">
            <button onClick={handleReset} className="text-gray-500 p-2 hover:text-gray-300">
              <RotateCcw size={18} />
            </button>
            <button onClick={onClose} className="text-gray-500 p-2 hover:text-gray-300">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6">

          {/* Calorie target */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Daily Calorie Target
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={calories}
                onChange={e => handleCaloriesChange(e.target.value)}
                className="flex-1 bg-gray-800 text-white text-2xl font-black rounded-xl px-4 py-3 text-center"
              />
              <span className="text-gray-500 font-semibold">kcal</span>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              Changing this keeps your macro % split and recalculates grams.
            </p>
          </div>

          {/* Mode toggle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Edit Mode
            </label>
            <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setMode('grams')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'grams' ? 'bg-gray-700 text-white' : 'text-gray-500'
                }`}
              >
                Grams → % follows
              </button>
              <button
                onClick={() => setMode('percent')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'percent' ? 'bg-gray-700 text-white' : 'text-gray-500'
                }`}
              >
                % → Grams follow
              </button>
            </div>
          </div>

          {/* Macro rows */}
          <div className="space-y-4">
            {macros.map(({ key, label, color, bar, value, pct }) => (
              <div key={key} className="bg-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${color}`}>{label}</span>
                  <span className="text-xs text-gray-500">
                    {value * CAL_PER_G[key]} cal
                  </span>
                </div>

                <div className="flex gap-3 items-center">
                  {/* Gram input */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Grams</label>
                    <input
                      type="number"
                      value={value}
                      onChange={e => {
                        if (mode === 'grams') {
                          handleGramChange(key, e.target.value);
                        } else {
                          // In % mode, direct gram edit is allowed but doesn't redistribute
                          if (key === 'protein') setProtein(Math.max(0, Number(e.target.value)));
                          else if (key === 'carbs') setCarbs(Math.max(0, Number(e.target.value)));
                          else setFat(Math.max(0, Number(e.target.value)));
                        }
                      }}
                      className={`w-full bg-gray-700 text-white font-bold text-lg rounded-xl px-3 py-2.5 text-center ${
                        mode === 'grams' ? 'ring-2 ring-blue-600/50' : ''
                      }`}
                    />
                  </div>

                  <div className="text-gray-600 text-lg font-bold mt-5">/</div>

                  {/* % input */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">% of calories</label>
                    <input
                      type="number"
                      value={pct}
                      onChange={e => {
                        if (mode === 'percent') {
                          handlePctChange(key, e.target.value);
                        } else {
                          // In gram mode, direct % edit recalculates all grams
                          handlePctChange(key, e.target.value);
                        }
                      }}
                      className={`w-full bg-gray-700 text-white font-bold text-lg rounded-xl px-3 py-2.5 text-center ${
                        mode === 'percent' ? 'ring-2 ring-blue-600/50' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Bar */}
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total macro calories</span>
              <span className={`font-bold ${Math.abs(calFromMacros - calories) > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                {calFromMacros} kcal
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Calorie target</span>
              <span className="font-bold text-white">{calories} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">% split</span>
              <span className={`font-semibold text-xs ${totalPct === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                P{pcts.proteinPct} / C{pcts.carbsPct} / F{pcts.fatPct} = {totalPct}%
              </span>
            </div>
            {Math.abs(calFromMacros - calories) > 50 && (
              <p className="text-xs text-yellow-400">
                ⚠ Macro total is {calFromMacros > calories ? 'over' : 'under'} your calorie target by {Math.abs(calFromMacros - calories)} cal
              </p>
            )}
          </div>

          {/* Water goal */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Daily Water Goal
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={water}
                onChange={e => setWater(Math.max(0, Number(e.target.value)))}
                className="flex-1 bg-gray-800 text-white text-2xl font-black rounded-xl px-4 py-3 text-center"
              />
              <span className="text-gray-500 font-semibold">oz / day</span>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base"
          >
            <Check size={20} /> Save Goals
          </button>
        </div>
      </div>
    </div>
  );
}
