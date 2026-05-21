import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aklxvxvblziftcwtiria.supabase.co'
const supabaseAnonKey = 'sb_publishable_mymsbFTUUZB_45okFLXbMg_qB4mUXk4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function searchForBarry() {
  try {
    console.log('Searching for users with username or email containing "barry"...')
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .or(`username.ilike.%barry%,email.ilike.%barry%`)
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} user(s):`)
      data.forEach(user => {
        console.log(`  - ID: ${user.id}`)
        console.log(`    Username: ${user.username}`)
        console.log(`    Email: ${user.email}`)
        console.log(`    Avatar URL: ${user.avatar_url || 'null'}`)
        console.log('')
      })
    } else {
      console.log('No users found with username or email containing "barry"')
      
      // Let's see what users we do have
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, username, email')
        .limit(10)
      
      if (allUsers) {
        console.log('\nFirst 10 users in database:')
        allUsers.forEach(user => {
          console.log(`  - ${user.username} (${user.email})`)
        })
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

searchForBarry()