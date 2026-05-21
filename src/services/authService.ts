import { supabase } from '../lib/supabase'

export const authService = {
  async signUp(email: string, password: string, username: string) {
    // Step 1: Create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })
    if (error) throw error

    // Step 2: Ensure profile exists — insert it directly, don't rely solely on trigger
    if (data.user) {
      // Retry up to 3 times in case the trigger is slightly delayed
      let profileCreated = false
      for (let i = 0; i < 3; i++) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            { id: data.user.id, username },
            { onConflict: 'id' }
          )
        if (!profileError) {
          profileCreated = true
          break
        }
        // If username is taken, throw a clear error
        if (profileError.code === '23505') {
          throw new Error('Username is already taken. Please choose a different one.')
        }
        // Wait 500ms before retrying
        await new Promise(r => setTimeout(r, 500))
      }
      if (!profileCreated) {
        console.warn('Profile could not be created after 3 attempts')
      }
    }

    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}