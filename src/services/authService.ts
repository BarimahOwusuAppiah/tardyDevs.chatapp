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

    // Step 2: Manually upsert the profile as a fallback in case the
    // trigger hasn't fired yet or ran into a conflict
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: data.user.id, username },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      // Don't throw on profile error — the trigger may have already created it
      if (profileError) {
        console.warn('Profile upsert warning (may already exist):', profileError.message)
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