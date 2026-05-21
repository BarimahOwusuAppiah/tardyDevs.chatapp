import { createClient } from '@supabase/supabase-js'

// Directly use the credentials from .env
const supabaseUrl = 'https://aklxvxvblziftcwtiria.supabase.co'
const supabaseAnonKey = 'sb_publishable_mymsbFTUUZB_45okFLXbMg_qB4mUXk4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSearch() {
  try {
    console.log('Testing connection to Supabase...')
    
    // Test basic connection
    const { data: countData, error: countError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' })
    
    if (countError) {
      console.error('Connection error:', countError)
      return
    }
    
    console.log('Connection successful')
    
    // Now search for Barry
    const { data: users, error: searchError } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .or(`username.ilike.%barry%,email.ilike.%barry%`)
    
    if (searchError) {
      console.error('Search error:', searchError)
      return
    }
    
    if (users && users.length > 0) {
      console.log(`Found ${users.length} user(s) matching "barry":`)
      users.forEach(user => {
        console.log(`  - ID: ${user.id}`)
        console.log(`    Username: ${user.username}`)
        console.log(`    Email: ${user.email}`)
        console.log(`    Avatar URL: ${user.avatar_url || 'null'}`)
        console.log('')
      })
    } else {
      console.log('No users found with username or email containing "barry"')
      
      // Show all users for debugging
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, username, email')
        .order('username')
        .limit(20)
      
      if (allUsers) {
        console.log('\nFirst 20 users in database:')
        allUsers.forEach(user => {
          console.log(`  - ${user.username} (${user.email})`)
        })
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

testSearch()