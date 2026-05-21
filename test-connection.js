const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://aklxvxvblziftcwtiria.supabase.co'
const supabaseAnonKey = 'sb_publishable_mymsbFTUUZB_45okFLXbMg_qB4mUXk4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('Connection error:', error)
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

testConnection()