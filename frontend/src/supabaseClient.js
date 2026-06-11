import { createClient } from '@supabase/supabase-js';

// Use environment variables or hardcode for MVP
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zhbzotzmodmvffwqalgq.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_WvK37m_Qd0rOPn8xcy5Vvw_kc-AuByP';

export const supabase = createClient(supabaseUrl, supabaseKey);
