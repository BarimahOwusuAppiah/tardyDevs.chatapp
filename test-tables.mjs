import { createClient } from '@supabase/supabase-js'

// Directly use the credentials from .env
const supabaseUrl = 'https://aklxvxvblziftcwtiria.supabase.co'
const supabaseAnonKey = 'sb_publishable_mymsbFTUUZB_45okFLXbMg_qB4mUXk4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testTables() {
  try {
    console.log('Testing connection to Supabase...')
    
    // Try to list tables in the public schema
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_tables') // This might not exist, but let's try a different approach
    
    // Alternative: try to query the information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (schemaError) {
      console.error('Schema query error:', schemaError)
      
      // Try a simpler approach - just see if we can query auth.users
      const { data: authData, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .limit(1)
        
      if (authError) {
        console.error('Auth users query error:', authError)
      } else {
        console.log('Auth users query successful:', authData)
      }
    } else {
      console.log('Tables in public schema:', schemaData)
    }
    
    // Try to query profiles directly
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' })
    
    if (profilesError) {
      console.error('Profiles query error:', profilesError)
    } else {
      console.log('Profiles query successful, count:', profilesData)
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

testTables()