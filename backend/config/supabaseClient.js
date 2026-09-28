// This file sets up ONE shared connection to Supabase (DB + Auth + Storage).
// Every other backend file that needs Supabase imports it from here.
// Do NOT create separate Supabase connections elsewhere — keeps everything consistent.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// service_role key = full backend access (bypasses row-level security)
// Only ever used on the backend. Never expose this key to the frontend.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
