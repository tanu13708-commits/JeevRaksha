const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client for regular operations (respects RLS)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Supabase admin client (bypasses RLS - use carefully)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase, supabaseAdmin };
