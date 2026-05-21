import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  username: string
  avatar_url?: string
  is_online?: boolean
  last_seen?: string
}

export interface DirectConversation {
  id: string
  participant_a_id: string
  participant_b_id: string
  last_message_at: string
  other_user: Profile
  last_message?: string
  unread_count?: number
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  reply_to_id?: string | null
  is_read: boolean
  created_at: string
  sender?: Profile
  reply_to?: DirectMessage | null
}

export const dmService = {
  // Search users by username (excludes self)
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    if (!query.trim()) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_online, last_seen')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', currentUserId)
      .limit(10)
    if (error) throw error
    return data ?? []
  },

  // Get or create a DM conversation between two users
  async getOrCreateConversation(userAId: string, userBId: string): Promise<DirectConversation> {
    // Always store with smaller UUID as participant_a (enforced by DB CHECK)
    const [a, b] = [userAId, userBId].sort()

    // Try to find existing
    const { data: existing, error: findError } = await supabase
      .from('direct_conversations')
      .select('*')
      .eq('participant_a_id', a)
      .eq('participant_b_id', b)
      .maybeSingle()

    if (findError) throw new Error(`Find conversation failed: ${findError.message}`)

    if (existing) {
      const other = await dmService.getProfile(userAId === a ? b : a)
      return { ...existing, other_user: other }
    }

    // Create new
    const { data: created, error } = await supabase
      .from('direct_conversations')
      .insert({ participant_a_id: a, participant_b_id: b })
      .select()
      .single()
    if (error) throw new Error(`Create conversation failed: ${error.message} (code: ${error.code})`)

    const other = await dmService.getProfile(userAId === a ? b : a)
    return { ...created, other_user: other }
  },

  // Get all conversations for a user, ordered by most recent
  async getConversations(userId: string): Promise<DirectConversation[]> {
    const { data, error } = await supabase
      .from('direct_conversations')
      .select('*')
      .or(`participant_a_id.eq.${userId},participant_b_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })
    if (error) throw error
    if (!data) return []

    // Fetch other user profiles in parallel
    const conversations = await Promise.all(
      data.map(async (conv) => {
        const otherId = conv.participant_a_id === userId
          ? conv.participant_b_id
          : conv.participant_a_id
        const other = await dmService.getProfile(otherId)

        // Get last message preview
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get unread count
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', userId)

        return {
          ...conv,
          other_user: other,
          last_message: lastMsg?.content,
          unread_count: count ?? 0,
        }
      })
    )
    return conversations
  },

  // Fetch messages for a conversation
  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:sender_id (id, username, avatar_url, is_online)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  // Send a DM
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    replyToId?: string
  ): Promise<DirectMessage> {
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        reply_to_id: replyToId ?? null,
      })
      .select(`*, sender:sender_id (id, username, avatar_url, is_online)`)
      .single()
    if (error) throw error
    return data
  },

  // Mark all messages in a conversation as read
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)
  },

  // Delete a DM (own messages only)
  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', senderId)
    if (error) throw error
  },

  // Get a single profile
  async getProfile(userId: string): Promise<Profile> {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_online, last_seen')
      .eq('id', userId)
      .single()
    return data ?? { id: userId, username: 'Unknown' }
  },

  // Update online status
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await supabase
      .from('profiles')
      .update({ is_online: isOnline, last_seen: new Date().toISOString() })
      .eq('id', userId)
  },
}
