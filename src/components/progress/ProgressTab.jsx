import { useState, useMemo } from 'react';
import { getWeightLog, logWeight, getBodyFatLog, getItem, setItem, getWorkoutSessions } from '../../utils/storage';
import { USER_PROFILE } from '../../data/userProfile';
import { WORKOUT_PROGRAM } from '../../data/workoutProgram';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { Plus, X, TrendingDown, Award, Calendar, Dumbbell } from 'lucide-react';

const BODY_FAT_KEY = 'fitness_body_fat_log';

function getBodyFatLogLocal() {
  try {
    return JSON.parse(localStorage.getItem(BODY_FAT_KEY)) || [];
  } catch { return []; }
}
function saveBodyFatEntry(entry) {
  const log = getBodyFatLogLocal();
  log.push(entry);
  localStorage.setItem(BODY_FAT_KEY, JSON.stringify(log));
}

const VIEWS = ['Body', 'Strength', 'Consistency'];

export default function ProgressTab() {
  const [view, setView] = useState('Body');

  return (
    <div className="pb-6">
      <div className="sticky top-0 bg-gray-950 z-10 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-white mb-3">Progress</h1>
        <div className="flex gap-2">
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                view === v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {view === 'Body' && <BodyProgress />}
        {view === 'Strength' && <StrengthProgress />}
        {view === 'Consistency' && <ConsistencyProgress />}
      </div>
    </div>
  );
}

// ─── Body Progress ───────────────────────────────────────────────────────────

function BodyProgress() {
  const [weightLog, setWeightLog] = useState(() => getWeightLog());
  const [bfLog, setBfLog] = useState(() => getBodyFatLogLocal());
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [showBfEntry, setShowBfEntry] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [bfInput, setBfInput] = useState('');

  const handleLogWeight = () => {
    const val = parseFloat(weightInput);
    if (!val) return;
    const entry = { weight: val, date: new Date().toISOString(), id: `w_${Date.now()}` };
    logWeight(entry);
    setWeightLog(getWeightLog());
    setWeightInput('');
    setShowWeightEntry(false);
  };

  const handleLogBf = () => {
    const val = parseFloat(bfInput);
    if (!val) return;
    const entry = { bodyFat: val, date: new Date().toISOString(), id: `bf_${Date.now()}` };
    saveBodyFatEntry(entry);
    setBfLog(getBodyFatLogLocal());
    setBfInput('');
    setShowBfEntry(false);
  };

  const currentWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1].weight : USER_PROFILE.weightLbs;
  const startWeight = weightLog.length > 0 ? weightLog[0].weight : USER_PROFILE.weightLbs;
  const weightChange = currentWeight - startWeight;
  const toGoal = currentWeight - USER_PROFILE.targetWeightLbs;

  const currentBf = bfLog.length > 0 ? bfLog[bfLog.length - 1].bodyFat : USER_PROFILE.bodyFatPercent;
  const leanMass = currentWeight * (1 - currentBf / 100);
  const fatMass = currentWeight * (currentBf / 100);

  // Build chart data — combine weight and bf by date proximity
  const weightChartData = weightLog.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
  }));

  // Body composition chart — use weight + bf entries merged
  const compositionData = useMemo(() => {
    if (weightLog.length === 0) return [];
    return weightLog.map(wEntry => {
      const wDate = new Date(wEntry.date);
      // Find closest bf entry
      let closestBf = USER_PROFILE.bodyFatPercent;
      let minDiff = Infinity;
      bfLog.forEach(bfEntry => {
        const diff = Math.abs(new Date(bfEntry.date) - wDate);
        if (diff < minDiff) { minDiff = diff; closestBf = bfEntry.bodyFat; }
      });
      const fat = wEntry.weight * (closestBf / 100);
      const lean = wEntry.weight - fat;
      return {
        date: new Date(wEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Lean Mass': Math.round(lean * 10) / 10,
        'Fat Mass': Math.round(fat * 10) / 10,
      };
    });
  }, [weightLog, bfLog]);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Current Weight</p>
          <p className="text-3xl font-black text-white mt-1">{currentWeight}<span className="text-base text-gray-500 font-normal">lbs</span></p>
          {weightChange !== 0 && (
            <p className={`text-sm font-semibold mt-1 ${weightChange < 0 ? 'text-green-400' : 'text-red-400'}`}>
              {weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)}lbs since start
            </p>
          )}
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">To Goal</p>
          <p className={`text-3xl font-black mt-1 ${toGoal <= 0 ? 'text-green-400' : 'text-white'}`}>
            {toGoal <= 0 ? '✓' : `${toGoal.toFixed(1)}`}
            {toGoal > 0 && <span className="text-base text-gray-500 font-normal">lbs</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">Target: {USER_PROFILE.targetWeightLbs}lbs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Body Fat</p>
          <p className="text-2xl font-black text-white mt-1">{currentBf}<span className="text-sm text-gray-500 font-normal">%</span></p>
          <p className="text-xs text-gray-500 mt-1">Fat: {fatMass.toFixed(1)}lbs</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Lean Mass</p>
          <p className="text-2xl font-black text-white mt-1">{leanMass.toFixed(1)}<span className="text-sm text-gray-500 font-normal">lbs</span></p>
          <p className="text-xs text-gray-500 mt-1">{(100 - currentBf).toFixed(0)}% of body</p>
        </div>
      </div>

      {/* Log buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowWeightEntry(!showWeightEntry)}
          className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} /> Log Weight
        </button>
        <button
          onClick={() => setShowBfEntry(!showBfEntry)}
          className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} /> Log Body Fat
        </button>
      </div>

      {showWeightEntry && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex gap-3">
          <input
            type="number"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            placeholder="Weight in lbs"
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 text-sm"
            autoFocus
          />
          <button onClick={handleLogWeight} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm">Save</button>
          <button onClick={() => setShowWeightEntry(false)} className="text-gray-500 px-2"><X size={18} /></button>
        </div>
      )}

      {showBfEntry && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex gap-3">
          <input
            type="number"
            value={bfInput}
            onChange={e => setBfInput(e.target.value)}
            placeholder="Body fat %"
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 text-sm"
            autoFocus
          />
          <button onClick={handleLogBf} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm">Save</button>
          <button onClick={() => setShowBfEntry(false)} className="text-gray-500 px-2"><X size={18} /></button>
        </div>
      )}

      {/* Weight chart */}
      {weightChartData.length > 1 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="text-sm font-bold text-white mb-4">Weight Over Time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weightChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ color: '#60a5fa', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} fill="url(#weightGrad)" dot={{ fill: '#3b82f6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fat vs Lean chart */}
      {compositionData.length > 1 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="text-sm font-bold text-white mb-4">Fat vs Lean Mass</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={compositionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ fontSize: 12 }}
              />
              <Area type="monotone" dataKey="Lean Mass" stroke="#22c55e" strokeWidth={2} fill="url(#leanGrad)" />
              <Area type="monotone" dataKey="Fat Mass" stroke="#ef4444" strokeWidth={2} fill="url(#fatGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-gray-400">Lean</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-gray-400">Fat</span></div>
          </div>
        </div>
      )}

      {weightChartData.length <= 1 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center text-gray-600">
          <TrendingDown size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Log weight on multiple days to see trends</p>
        </div>
      )}

      {/* Weight history list */}
      {weightLog.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Weight Log</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...weightLog].reverse().map((entry, i) => (
              <div key={entry.id || i} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="font-bold text-white">{entry.weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Strength Progress ───────────────────────────────────────────────────────

function StrengthProgress() {
  const sessions = getWorkoutSessions();
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Build exercise list with PR data
  const exerciseMap = useMemo(() => {
    const map = {};
    [...sessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).forEach(session => {
      const workout = WORKOUT_PROGRAM[session.workoutId];
      Object.entries(session.sets || {}).forEach(([exerciseId, sets]) => {
        if (!sets || sets.length === 0) return;
        let name = exerciseId;
        if (workout) {
          const all = workout.supersets.flatMap(ss => ss.exercises);
          const found = all.find(e => e.id === exerciseId);
          if (found) name = found.name;
        }
        if (!map[exerciseId]) map[exerciseId] = { name, data: [] };
        const maxWeight = Math.max(...sets.map(s => s.weight || 0));
        if (maxWeight > 0) {
          map[exerciseId].data.push({
            date: new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weight: maxWeight,
            sets: sets.length,
            volume: sets.reduce((s, set) => s + (set.reps || 0) * (set.weight || 0), 0),
          });
        }
      });
    });
    return map;
  }, [sessions]);

  // Personal records
  const records = useMemo(() =>
    Object.values(exerciseMap)
      .filter(e => e.data.length > 0)
      .map(e => ({
        name: e.name,
        pr: Math.max(...e.data.map(d => d.weight)),
        sessions: e.data.length,
      }))
      .sort((a, b) => b.pr - a.pr),
    [exerciseMap]
  );

  if (selectedExercise) {
    const data = exerciseMap[selectedExercise];
    return <ExerciseStrengthChart data={data} onBack={() => setSelectedExercise(null)} />;
  }

  return (
    <div className="space-y-4 pt-2">
      {records.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No strength data yet</p>
          <p className="text-sm mt-1">Log weighted exercises to track progression</p>
        </div>
      )}

      {records.length > 0 && (
        <>
          <p className="text-xs text-gray-500">Tap an exercise to see its progression chart</p>
          <div className="space-y-2">
            {records.map((r, i) => (
              <button
                key={r.name}
                onClick={() => {
                  const id = Object.keys(exerciseMap).find(k => exerciseMap[k].name === r.name);
                  setSelectedExercise(id);
                }}
                className="w-full bg-gray-900 rounded-xl border border-gray-800 p-4 text-left flex items-center gap-3"
              >
                <span className="text-2xl font-black text-gray-700 w-7 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.sessions} session{r.sessions !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-yellow-400">{r.pr}lbs</p>
                  <p className="text-xs text-gray-500">PR</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExerciseStrengthChart({ data, onBack }) {
  const pr = Math.max(...data.data.map(d => d.weight));

  return (
    <div className="pt-2 space-y-4">
      <button onClick={onBack} className="text-blue-400 text-sm font-semibold flex items-center gap-1">← Back</button>
      <h2 className="text-xl font-bold text-white">{data.name}</h2>
      <p className="text-sm text-yellow-400 font-semibold">🏆 PR: {pr}lbs</p>

      {data.data.length > 1 ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="text-sm font-bold text-white mb-4">Max Weight Per Session</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ color: '#facc15', fontSize: 12 }}
              />
              <Line type="monotone" dataKey="weight" stroke="#facc15" strokeWidth={2} dot={{ fill: '#facc15', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 text-center text-gray-600 text-sm py-8">
          Log this exercise in more sessions to see a trend
        </div>
      )}

      {/* Volume chart */}
      {data.data.length > 1 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="text-sm font-bold text-white mb-4">Volume (lbs × reps)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ color: '#60a5fa', fontSize: 12 }}
              />
              <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Session history */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <h3 className="text-sm font-bold text-white mb-3">Session History</h3>
        <div className="space-y-2">
          {[...data.data].reverse().map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0">
              <span className="text-gray-400">{d.date}</span>
              <div className="text-right">
                <span className={`font-bold ${d.weight === pr ? 'text-yellow-400' : 'text-white'}`}>{d.weight}lbs</span>
                {d.weight === pr && <span className="text-xs text-yellow-400 ml-1">PR</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Consistency ─────────────────────────────────────────────────────────────

function ConsistencyProgress() {
  const sessions = getWorkoutSessions();

  // Sessions per week over the past 12 weeks
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay()) - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = sessions.filter(s => {
        const d = new Date(s.startTime);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeks.push({
        week: `W${12 - i}`,
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: count,
        completed: sessions.filter(s => {
          const d = new Date(s.startTime);
          return d >= weekStart && d < weekEnd && s.status === 'completed';
        }).length,
      });
    }
    return weeks;
  }, [sessions]);

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const avgPerWeek = weeklyData.length > 0
    ? (weeklyData.reduce((s, w) => s + w.sessions, 0) / weeklyData.filter(w => w.sessions > 0).length || 0).toFixed(1)
    : 0;

  const currentStreak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sorted = [...sessions].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    let streak = 0;
    let lastDate = new Date();
    lastDate.setHours(0, 0, 0, 0);
    for (const s of sorted) {
      const sDate = new Date(s.startTime);
      sDate.setHours(0, 0, 0, 0);
      const diff = Math.round((lastDate - sDate) / (1000 * 60 * 60 * 24));
      if (diff <= 1) { streak++; lastDate = sDate; }
      else break;
    }
    return streak;
  }, [sessions]);

  return (
    <div className="space-y-5 pt-2">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
          <p className="text-2xl font-black text-white">{totalSessions}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight">Total Sessions</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
          <p className="text-2xl font-black text-green-400">{completedSessions}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight">Completed</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
          <p className="text-2xl font-black text-blue-400">{currentStreak}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight">Day Streak</p>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Sessions Per Week</h3>
          <span className="text-xs text-gray-500">{avgPerWeek} avg/wk</span>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">No sessions yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ color: '#60a5fa', fontSize: 12 }}
              />
              <Bar dataKey="completed" fill="#22c55e" radius={[3, 3, 0, 0]} name="Completed" stackId="a" />
              <Bar dataKey="sessions" fill="#3b82f630" radius={[3, 3, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-gray-400">Completed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500/30" /><span className="text-xs text-gray-400">All Sessions</span></div>
        </div>
      </div>

      {/* Workout type breakdown */}
      {sessions.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Workout Breakdown</h3>
          <div className="space-y-2">
            {['U1','L1','U2','L2','U3','L3'].map(id => {
              const count = sessions.filter(s => s.workoutId === id).length;
              const pct = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
              const workout = WORKOUT_PROGRAM[id];
              return (
                <div key={id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400">{workout?.name || id}</span>
                    <span className="text-xs text-gray-500">{count}×</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
