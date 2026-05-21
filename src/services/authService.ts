import { supabase } from '../lib/supabase'

export const authService = {
  async signUp(email: string, password: string, username: string) {
    // Step 1: Create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        // Skip email confirmation redirect
        emailRedirectTo: undefined,
      },
    })
    if (error) throw error

    // Step 2: If Supabase email confirmation is ON, the session will be null.
    // Auto sign-in so the user gets a live session immediately.
    let activeUser = data.user
    if (data.user && !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      activeUser = signInData.user
    }

    // Step 3: Ensure profile exists
    if (activeUser) {
      let profileCreated = false
      for (let i = 0; i < 3; i++) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            { id: activeUser.id, username },
            { onConflict: 'id' }
          )
        if (!profileError) {
          profileCreated = true
          break
        }
        if (profileError.code === '23505') {
          throw new Error('Username is already taken. Please choose a different one.')
        }
        await new Promise(r => setTimeout(r, 500))
      }
      if (!profileCreated) {
        console.warn('Profile could not be created after 3 attempts')
      }
    }

    // Return with a guaranteed user reference
    return { ...data, user: activeUser }
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