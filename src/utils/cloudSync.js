import { supabase, USER_ID } from '../lib/supabase';

const TABLE = 'fitness_data';

// Debounce timers per key
const timers = {};

/**
 * Pull all data for this user from Supabase and hydrate localStorage.
 * Returns true on success, false on failure.
 */
export async function pullFromCloud() {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('key, value')
      .eq('user_id', USER_ID);

    if (error) throw error;

    if (data && data.length > 0) {
      data.forEach(row => {
        try {
          localStorage.setItem(row.key, JSON.stringify(row.value));
        } catch (e) {
          console.warn('Failed to hydrate key', row.key, e);
        }
      });
    }
    return true;
  } catch (e) {
    console.warn('Cloud pull failed (offline?):', e.message);
    return false;
  }
}

/**
 * Push a single key-value pair to Supabase.
 * Debounced per key to avoid hammering on rapid writes.
 */
export function pushToCloud(key, value) {
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(async () => {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          { user_id: USER_ID, key, value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
      if (error) throw error;
    } catch (e) {
      console.warn('Cloud push failed (offline?):', e.message);
    }
  }, 1500);
}

/**
 * Check if Supabase is reachable.
 */
export async function checkCloudConnection() {
  try {
    const { error } = await supabase.from(TABLE).select('key').eq('user_id', USER_ID).limit(1);
    return !error;
  } catch {
    return false;
  }
}
