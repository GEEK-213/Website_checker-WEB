const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// We now use the SERVICE_KEY for all server-side operations
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Error: Supabase environment variables not found. Please ensure you have SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.'
  );
  process.exit(1);
}

// Create the client, passing in the service role key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // This configuration tells the Supabase client to act as a service role,
    // which bypasses all RLS policies.
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;

