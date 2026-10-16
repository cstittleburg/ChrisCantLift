import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WORKOUT_PROGRAM, workoutIdForDate } from '../data/workoutProgram';
import {
  getWorkoutChoice,
  setWorkoutChoice,
  saveWorkoutSession,
  getWorkoutSessions,
  getExerciseWeights,
  setExerciseWeight,
  getItem,
  setItem,
  getPendingAdvances,
  setPendingAdvance,
  clearPendingAdvance,
} from '../utils/storage';
import { checkProgression } from '../utils/progression';

const ACTIVE_SESSION_KEY = 'fitness_active_session';

const WorkoutContext = createContext(null);

// Local calendar date as 'YYYY-MM-DD'
const dateKey = (d) => d.toLocaleDateString('en-CA');

export function WorkoutProvider({ children }) {
  const [choice, setChoiceState] = useState(() => getWorkoutChoice());

  // Rehydrate active session from localStorage on load — survives page reloads & mobile unloads.
  // A session started under a workout that's since left the program moves to today's
  // workout; its logged sets are kept and save with it.
  const [activeSession, setActiveSessionState] = useState(() => {
    const saved = getItem(ACTIVE_SESSION_KEY) || null;
    if (saved && !WORKOUT_PROGRAM[saved.workoutId]) {
      const workoutId = workoutIdForDate(new Date());
      return { ...saved, workoutId, workoutName: WORKOUT_PROGRAM[workoutId].name, switchedFrom: saved.workoutId };
    }
    return saved;
  });
  const [sessions, setSessions] = useState(() => getWorkoutSessions());

  // Mirror every activeSession change to localStorage immediately
  const setActiveSession = useCallback((updater) => {
    setActiveSessionState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === null) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      } else {
        setItem(ACTIVE_SESSION_KEY, next);
      }
      return next;
    });
  }, []);

  // "Up next" is the workout for today's weekday — or tomorrow's once a session has
  // been saved today — unless a different one was picked by hand for that date.
  const now = new Date();
  const doneToday = sessions.some(s => dateKey(new Date(s.startTime)) === dateKey(now));
  const dayOffset = doneToday ? 1 : 0;
  const dayAt = (i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset + i);
  const nextDateKey = dateKey(dayAt(0));
  const nextWorkoutId = choice?.date === nextDateKey && WORKOUT_PROGRAM[choice.workoutId]
    ? choice.workoutId
    : workoutIdForDate(dayAt(0));
  const nextWorkout = WORKOUT_PROGRAM[nextWorkoutId];
  const nextWorkoutDay = doneToday ? 'Tomorrow' : 'Today';
  const upcomingWorkouts = [1, 2].map(i => WORKOUT_PROGRAM[workoutIdForDate(dayAt(i))]);

  const startWorkout = useCallback(() => {
    const session = {
      id: `session_${Date.now()}`,
      workoutId: nextWorkoutId,
      workoutName: nextWorkout.name,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'active', // active | completed | incomplete
      sets: {}, // exerciseId -> array of set objects
      warmUpDone: {},
      finisherDone: {},
      accessoryDone: {},
      skipReasons: {},
      lowerBackPainFlag: false,
      notes: '',
    };
    setActiveSession(session);
    return session;
  }, [nextWorkoutId, nextWorkout]);

  const logSet = useCallback((exerciseId, setData) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const sets = { ...prev.sets };
      sets[exerciseId] = [...(sets[exerciseId] || []), setData];
      return { ...prev, sets };
    });
    // Persist last used weight and clear any pending advance (it's been acted on)
    if (setData.weight) {
      setExerciseWeight(exerciseId, setData.weight);
      clearPendingAdvance(exerciseId);
    }
  }, []);

  const updateSet = useCallback((exerciseId, setIndex, setData) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const sets = { ...prev.sets };
      const exSets = [...(sets[exerciseId] || [])];
      exSets[setIndex] = setData;
      sets[exerciseId] = exSets;
      return { ...prev, sets };
    });
  }, []);

  const logWarmUp = useCallback((exerciseId, data) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      return { ...prev, warmUpDone: { ...prev.warmUpDone, [exerciseId]: data } };
    });
  }, []);

  const logFinisher = useCallback((exerciseId, data) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      return { ...prev, finisherDone: { ...prev.finisherDone, [exerciseId]: data } };
    });
  }, []);

  const logAccessory = useCallback((exerciseId, data) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      return { ...prev, accessoryDone: { ...prev.accessoryDone, [exerciseId]: data } };
    });
  }, []);

  const completeWorkout = useCallback(() => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const completed = { ...prev, status: 'completed', endTime: new Date().toISOString() };
      saveWorkoutSession(completed);
      setSessions(getWorkoutSessions());

      // Check each exercise for progression and store pending advances (+5 lbs)
      const workout = WORKOUT_PROGRAM[prev.workoutId];
      if (workout) {
        const allExercises = workout.supersets.flatMap(ss => ss.exercises);
        const weights = getExerciseWeights();
        allExercises.forEach(exercise => {
          const setsLogged = prev.sets?.[exercise.id] || [];
          if (checkProgression(exercise, setsLogged) === 'advance') {
            const lastW = weights[exercise.id];
            if (lastW) {
              setPendingAdvance(exercise.id, lastW + 5);
            }
          }
        });
      }

      return null;
    });
  }, []);

  const endWorkoutEarly = useCallback((skipData) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const incomplete = {
        ...prev,
        status: 'incomplete',
        endTime: new Date().toISOString(),
        skipData,
      };
      saveWorkoutSession(incomplete);
      setSessions(getWorkoutSessions());
      return null;
    });
  }, []);

  /**
   * Returns the pre-fill weight for an exercise.
   * Priority: pending advance (+5 suggestion) > last logged weight > null
   */
  const getLastWeight = useCallback((exerciseId) => {
    const advances = getPendingAdvances();
    if (advances[exerciseId] !== undefined) return advances[exerciseId];
    const weights = getExerciseWeights();
    return weights[exerciseId] || null;
  }, []);

  // Change which workout is "up next" before starting (does not affect active session).
  // Applies to that one date only; the next day goes back to its weekday's workout.
  const selectNextWorkout = useCallback((workoutId) => {
    if (!WORKOUT_PROGRAM[workoutId]) return;
    const c = { date: nextDateKey, workoutId };
    setWorkoutChoice(c);
    setChoiceState(c);
  }, [nextDateKey]);

  // Switch workout type mid-session — keeps ALL logged sets intact, just changes
  // which exercises are displayed. Both old and new sets save together at end.
  const switchSessionWorkout = useCallback((workoutId) => {
    const workout = WORKOUT_PROGRAM[workoutId];
    if (!workout) return;
    setActiveSession(prev => {
      if (!prev) return prev;
      return { ...prev, workoutId, workoutName: workout.name, switchedFrom: prev.workoutId };
    });
  }, []);

  return (
    <WorkoutContext.Provider value={{
      nextWorkout,
      nextWorkoutId,
      nextWorkoutDay,
      upcomingWorkouts,
      activeSession,
      sessions,
      startWorkout,
      logSet,
      updateSet,
      logWarmUp,
      logFinisher,
      logAccessory,
      completeWorkout,
      endWorkoutEarly,
      getLastWeight,
      selectNextWorkout,
      switchSessionWorkout,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
