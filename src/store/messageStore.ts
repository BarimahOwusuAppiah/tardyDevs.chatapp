import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface Reaction {
  emoji: string
  count: number
  userIds: string[]
}

export interface Message {
  id: string
  content: string
  user_id: string
  channel_id: string
  created_at: string
  reply_to_id?: string | null
  profiles?: {
    username: string
    avatar_url?: string
  }
  reactions?: Reaction[]
}

interface MessageState {
  messages: Message[]
  isLoading: boolean
  replyingTo: Message | null
  typingUsers: string[]
  sendMessage: (content: string, channelId: string, userId: string, replyToId?: string) => Promise<void>
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  fetchMessages: (channelId: string) => Promise<void>
  subscribeToMessages: (channelId: string) => void
  unsubscribeFromMessages: () => void
  setReplyingTo: (msg: Message | null) => void
  toggleReaction: (messageId: string, emoji: string, userId: string) => void
  deleteMessage: (messageId: string, userId: string) => Promise<void>
  broadcastTyping: (channelId: string, userId: string, username: string) => void
}

let messageSubscription: ReturnType<typeof supabase.channel> | null = null
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  replyingTo: null,
  typingUsers: [],

  setReplyingTo: (msg) => set({ replyingTo: msg }),

  toggleReaction: (messageId, emoji, userId) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== messageId) return msg
        const reactions = msg.reactions ? [...msg.reactions] : []
        const existing = reactions.find((r) => r.emoji === emoji)
        if (existing) {
          const hasReacted = existing.userIds.includes(userId)
          if (hasReacted) {
            existing.count = Math.max(0, existing.count - 1)
            existing.userIds = existing.userIds.filter((id) => id !== userId)
          } else {
            existing.count += 1
            existing.userIds = [...existing.userIds, userId]
          }
          return { ...msg, reactions: reactions.filter((r) => r.count > 0) }
        } else {
          return { ...msg, reactions: [...reactions, { emoji, count: 1, userIds: [userId] }] }
        }
      }),
    }))
  },

  deleteMessage: async (messageId, userId) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId)
    if (!error) {
      set((state) => ({ messages: state.messages.filter((m) => m.id !== messageId) }))
    }
  },

  sendMessage: async (content, channelId, userId, replyToId) => {
    const { error } = await supabase.from('messages').insert({
      content,
      user_id: userId,
      channel_id: channelId,
      reply_to_id: replyToId ?? null,
    })
    if (error) throw error
  },

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  fetchMessages: async (channelId) => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('messages')
      .select(`*, profiles:user_id (username, avatar_url)`)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
    set({ isLoading: false })
    if (!error && data) {
      set({ messages: data.map((m) => ({ ...m, reactions: [] })) })
    }
  },

  // Broadcast typing — auto-stops after 3s of no keystrokes
  broadcastTyping: (channelId, userId, username) => {
    if (!messageSubscription) return
    messageSubscription.track({ typing: true, userId, username, channelId })
    if (typingTimers[userId]) clearTimeout(typingTimers[userId])
    typingTimers[userId] = setTimeout(() => {
      messageSubscription?.untrack()
      delete typingTimers[userId]
    }, 3000)
  },

  subscribeToMessages: (channelId) => {
    get().unsubscribeFromMessages()
    set({ typingUsers: [] })

    messageSubscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', newMsg.user_id)
          .single()
        get().addMessage({
          ...newMsg,
          reactions: [],
          profiles: profile ?? { username: 'Unknown' },
        })
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== (payload.old as Message).id),
        }))
      })
      // Presence: typing indicators
      .on('presence', { event: 'sync' }, () => {
        const presenceState = messageSubscription?.presenceState() ?? {}
        const typers: string[] = []
        for (const presences of Object.values(presenceState)) {
          for (const p of presences as any[]) {
            if (p.typing && p.username) typers.push(p.username)
          }
        }
        set({ typingUsers: typers })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leaving = (leftPresences as any[])
          .filter(p => p.typing)
          .map(p => p.username)
        if (leaving.length > 0) {
          set((state) => ({
            typingUsers: state.typingUsers.filter(u => !leaving.includes(u)),
          }))
        }
      })
      .subscribe()
  },

  unsubscribeFromMessages: () => {
    if (messageSubscription) {
      messageSubscription.untrack()
      messageSubscription.unsubscribe()
      messageSubscription = null
    }
    Object.values(typingTimers).forEach(clearTimeout)
    set({ typingUsers: [] })
  },
}))
