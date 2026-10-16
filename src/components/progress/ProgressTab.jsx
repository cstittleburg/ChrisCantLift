import { useState, useMemo } from 'react';
import { getWeightLog, logWeight, getBodyFatLog, getItem, setItem, getWorkoutSessions } from '../../utils/storage';
import { USER_PROFILE } from '../../data/userProfile';
import { PROGRAM_SEQUENCE, WORKOUT_PROGRAM } from '../../data/workoutProgram';
import { getAllExercisesMap } from '../../utils/exerciseRegistry';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { Plus, X, TrendingDown, Award, Calendar, Dumbbell } from 'lucide-react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import SectionLabel from '../ui/SectionLabel';
import SegmentedControl from '../ui/SegmentedControl';
import SyncStatus from '../ui/SyncStatus';

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
      <div className="sticky top-0 bg-floor z-10 px-4 pt-6 pb-3">
        <h1 className="font-display font-extrabold uppercase text-[40px] leading-none">Progress</h1>
        <SyncStatus className="mt-1" />
        <div className="mt-3">
          <SegmentedControl options={VIEWS.map(v => [v, v])} value={view} onChange={setView} />
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
      {/* Current weight hero */}
      <section className="bg-bench border border-seam rounded-card p-5 flex items-end justify-between gap-3">
        <div>
          <SectionLabel>Current weight</SectionLabel>
          <p className="mt-1 tabular-nums">
            <span className="font-display font-extrabold text-[56px] leading-none text-chalk">{currentWeight}</span>
            <span className="text-dust text-lg ml-1">lbs</span>
          </p>
          {weightChange !== 0 && (
            <p className="text-sm text-dust mt-1 tabular-nums">
              {weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)} lbs since start
            </p>
          )}
        </div>
        <div className="text-right pb-1">
          <p className="text-sm text-dust tabular-nums">Goal {USER_PROFILE.targetWeightLbs}</p>
          <p className={`font-display font-bold text-xl tabular-nums ${toGoal <= 0 ? 'text-teal' : 'text-orange'}`}>
            {toGoal <= 0 ? 'Goal reached' : `${toGoal.toFixed(1)} to go`}
          </p>
        </div>
      </section>

      {/* Body composition tiles */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Body fat', currentBf, '%'],
          ['Lean mass', leanMass.toFixed(1), 'lbs'],
          ['Fat mass', fatMass.toFixed(1), 'lbs'],
        ].map(([label, value, unit]) => (
          <div key={label} className="bg-bench border border-seam rounded-tile p-3">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-dust">{label}</p>
            <p className="mt-1 tabular-nums">
              <span className="font-display font-bold text-2xl text-chalk">{value}</span>
              <span className="text-dust text-xs ml-0.5">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Log buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setShowWeightEntry(!showWeightEntry)} className="flex-1 text-lg whitespace-nowrap px-3">
          <Plus size={18} strokeWidth={3} /> Log weight
        </Button>
        <Button variant="secondary" onClick={() => setShowBfEntry(!showBfEntry)} className="flex-1 min-h-[56px] rounded-tile whitespace-nowrap px-3">
          <Plus size={18} /> Log body fat
        </Button>
      </div>

      {showWeightEntry && (
        <div className="bg-bench border border-seam rounded-tile p-3 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            placeholder="Weight in lbs"
            aria-label="Weight in lbs"
            className="flex-1 min-w-0 h-11 bg-floor border border-seam rounded-input px-3 text-chalk tabular-nums placeholder-ash"
            autoFocus
          />
          <Button variant="secondary" onClick={handleLogWeight}>Save</Button>
          <IconButton aria-label="Cancel" onClick={() => setShowWeightEntry(false)}><X size={18} /></IconButton>
        </div>
      )}

      {showBfEntry && (
        <div className="bg-bench border border-seam rounded-tile p-3 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={bfInput}
            onChange={e => setBfInput(e.target.value)}
            placeholder="Body fat %"
            aria-label="Body fat percent"
            className="flex-1 min-w-0 h-11 bg-floor border border-seam rounded-input px-3 text-chalk tabular-nums placeholder-ash"
            autoFocus
          />
          <Button variant="secondary" onClick={handleLogBf}>Save</Button>
          <IconButton aria-label="Cancel" onClick={() => setShowBfEntry(false)}><X size={18} /></IconButton>
        </div>
      )}

      {/* Weight chart */}
      {weightChartData.length > 1 && (
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="text-sm font-bold text-chalk mb-4">Weight Over Time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weightChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B2C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B2C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#33302C" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ background: '#1C1A18', border: '1px solid #33302C', borderRadius: 12 }}
                labelStyle={{ color: '#A39E95', fontSize: 11 }}
                itemStyle={{ color: '#FF6B2C', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="weight" stroke="#FF6B2C" strokeWidth={2} fill="url(#weightGrad)" dot={{ fill: '#FF6B2C', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fat vs Lean chart */}
      {compositionData.length > 1 && (
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="text-sm font-bold text-chalk mb-4">Fat vs Lean Mass</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={compositionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4FB3A9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4FB3A9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B2C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B2C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#33302C" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1C1A18', border: '1px solid #33302C', borderRadius: 12 }}
                labelStyle={{ color: '#A39E95', fontSize: 11 }}
                itemStyle={{ fontSize: 12 }}
              />
              <Area type="monotone" dataKey="Lean Mass" stroke="#4FB3A9" strokeWidth={2} fill="url(#leanGrad)" />
              <Area type="monotone" dataKey="Fat Mass" stroke="#FF6B2C" strokeWidth={2} fill="url(#fatGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-teal" /><span className="text-xs text-dust">Lean</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange" /><span className="text-xs text-dust">Fat</span></div>
          </div>
        </div>
      )}

      {weightChartData.length <= 1 && (
        <div className="bg-bench rounded-card border border-seam p-6 text-center text-ash">
          <TrendingDown size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Log weight on multiple days to see trends</p>
        </div>
      )}

      {/* Weight history list */}
      {weightLog.length > 0 && (
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="text-sm font-bold text-chalk mb-3">Weight Log</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...weightLog].reverse().map((entry, i) => (
              <div key={entry.id || i} className="flex items-center justify-between text-sm">
                <span className="text-dust">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="font-bold text-chalk">{entry.weight} lbs</span>
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
    const names = getAllExercisesMap(); // includes swapped-out exercises
    [...sessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).forEach(session => {
      Object.entries(session.sets || {}).forEach(([exerciseId, sets]) => {
        if (!sets || sets.length === 0) return;
        const name = names[exerciseId] || exerciseId;
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
        <div className="text-center py-16 text-ash">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No strength data yet</p>
          <p className="text-sm mt-1">Log weighted exercises to track progression</p>
        </div>
      )}

      {records.length > 0 && (
        <>
          <p className="text-xs text-dust">Tap an exercise to see its progression chart</p>
          <div className="space-y-2">
            {records.map((r, i) => (
              <button
                key={r.name}
                onClick={() => {
                  const id = Object.keys(exerciseMap).find(k => exerciseMap[k].name === r.name);
                  setSelectedExercise(id);
                }}
                className="w-full bg-bench rounded-xl border border-seam p-4 text-left flex items-center gap-3"
              >
                <span className="text-2xl font-black text-ash w-7 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-bold text-chalk text-sm">{r.name}</p>
                  <p className="text-xs text-dust">{r.sessions} session{r.sessions !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-brass">{r.pr}lbs</p>
                  <p className="text-xs text-dust">PR</p>
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
      <button onClick={onBack} className="text-orange text-sm font-semibold flex items-center gap-1">← Back</button>
      <h2 className="text-xl font-bold text-chalk">{data.name}</h2>
      <p className="text-sm text-brass font-semibold">🏆 PR: {pr}lbs</p>

      {data.data.length > 1 ? (
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="text-sm font-bold text-chalk mb-4">Max Weight Per Session</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33302C" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                contentStyle={{ background: '#1C1A18', border: '1px solid #33302C', borderRadius: 12 }}
                labelStyle={{ color: '#A39E95', fontSize: 11 }}
                itemStyle={{ color: '#FF6B2C', fontSize: 12 }}
              />
              <Line type="monotone" dataKey="weight" stroke="#FF6B2C" strokeWidth={2} dot={{ fill: '#FF6B2C', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-bench rounded-card border border-seam p-4 text-center text-ash text-sm py-8">
          Log this exercise in more sessions to see a trend
        </div>
      )}

      {/* Volume chart */}
      {data.data.length > 1 && (
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="text-sm font-bold text-chalk mb-4">Volume (lbs × reps)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33302C" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1C1A18', border: '1px solid #33302C', borderRadius: 12 }}
                labelStyle={{ color: '#A39E95', fontSize: 11 }}
                itemStyle={{ color: '#FF6B2C', fontSize: 12 }}
              />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {data.data.map((_, i) => (
                  <Cell key={i} fill={i === data.data.length - 1 ? '#FF6B2C' : '#33302C'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Session history */}
      <div className="bg-bench rounded-card border border-seam p-4">
        <h3 className="text-sm font-bold text-chalk mb-3">Session History</h3>
        <div className="space-y-2">
          {[...data.data].reverse().map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-seam pb-2 last:border-0 last:pb-0">
              <span className="text-dust">{d.date}</span>
              <div className="text-right">
                <span className={`font-bold ${d.weight === pr ? 'text-brass' : 'text-chalk'}`}>{d.weight}lbs</span>
                {d.weight === pr && <span className="text-xs text-brass ml-1">PR</span>}
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
        <div className="bg-bench rounded-xl border border-seam p-3 text-center">
          <p className="text-2xl font-black text-chalk">{totalSessions}</p>
          <p className="text-xs text-dust mt-0.5 leading-tight">Total Sessions</p>
        </div>
        <div className="bg-bench rounded-xl border border-seam p-3 text-center">
          <p className="text-2xl font-black text-teal">{completedSessions}</p>
          <p className="text-xs text-dust mt-0.5 leading-tight">Completed</p>
        </div>
        <div className="bg-bench rounded-xl border border-seam p-3 text-center">
          <p className="text-2xl font-black text-orange">{currentStreak}</p>
          <p className="text-xs text-dust mt-0.5 leading-tight">Day Streak</p>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-bench rounded-card border border-seam p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-chalk">Sessions Per Week</h3>
          <span className="text-xs text-dust">{avgPerWeek} avg/wk</span>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-ash text-sm">No sessions yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33302C" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8C877E' }} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1C1A18', border: '1px solid #33302C', borderRadius: 12 }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
                labelStyle={{ color: '#A39E95', fontSize: 11 }}
                itemStyle={{ color: '#FF6B2C', fontSize: 12 }}
              />
              <Bar dataKey="completed" radius={[3, 3, 0, 0]} name="Completed" stackId="a">
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={i === weeklyData.length - 1 ? '#FF6B2C' : '#8C877E'} />
                ))}
              </Bar>
              <Bar dataKey="sessions" fill="#262320" radius={[3, 3, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-ash" /><span className="text-xs text-dust">Completed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange" /><span className="text-xs text-dust">This week</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-plate border border-seam" /><span className="text-xs text-dust">All Sessions</span></div>
        </div>
      </div>

      {/* Workout type breakdown */}
      {sessions.length > 0 && (
        <div className="bg-bench rounded-card border border-seam p-4">
          <h3 className="text-sm font-bold text-chalk mb-3">Workout Breakdown</h3>
          <div className="space-y-2">
            {/* Current workouts first, then any older ones found in past sessions */}
            {[...new Set([...PROGRAM_SEQUENCE, ...sessions.map(s => s.workoutId)])].map(id => {
              const count = sessions.filter(s => s.workoutId === id).length;
              if (count === 0 && !WORKOUT_PROGRAM[id]) return null;
              const pct = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
              const name = WORKOUT_PROGRAM[id]?.name
                || sessions.filter(s => s.workoutId === id).at(-1)?.workoutName
                || id;
              return (
                <div key={id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-dust">{name}</span>
                    <span className="text-xs text-dust">{count}×</span>
                  </div>
                  <div className="h-1.5 bg-plate rounded-full overflow-hidden">
                    <div className="h-full bg-orange rounded-full" style={{ width: `${pct}%` }} />
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
