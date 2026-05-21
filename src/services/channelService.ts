import { supabase } from '../lib/supabase'

export const channelService = {
  async getChannels() {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createChannel(name: string) {
    const { data, error } = await supabase
      .from('channels')
      .insert({ name })
      .select()
      .single()
    
    if (error) throw error
    return data
  },
}