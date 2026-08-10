import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jgnjmmwkirxpnptmymsd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OujTakWDBFQldc6e6nElWA_6gKg7Q7s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const USER_ID = 'chris';
