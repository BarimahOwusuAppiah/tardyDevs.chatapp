import { supabase } from '../lib/supabase'

export const messageService = {
  async getMessages(channelId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, profiles:user_id (username, avatar_url)`)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  async sendMessage(content: string, channelId: string, userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content,
        user_id: userId,
        channel_id: channelId,
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },
}