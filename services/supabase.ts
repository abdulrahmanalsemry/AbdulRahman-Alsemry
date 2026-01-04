
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase configuration.
 * We prioritize environment variables (SUPABASE_URL and SUPABASE_ANON_KEY).
 * If missing, we use the project details provided to ensure the client initializes correctly.
 */
const supabaseUrl = (typeof process !== 'undefined' && (process.env as any).SUPABASE_URL) 
  || 'https://rvzgqdrffteirjckxsds.supabase.co';

const supabaseAnonKey = (typeof process !== 'undefined' && (process.env as any).SUPABASE_ANON_KEY) 
  || 'sb_publishable_csxEgmox10fp5rkXTkasRg_nHQIMVaF';

// Initialize the Supabase client. 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
