import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { dmService } from '../services/dmService'
import type { DirectConversation, DirectMessage, Profile } from '../services/dmService'

interface DmState {
  conversations: DirectConversation[]
  activeConversation: DirectConversation | null
  messages: DirectMessage[]
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  isSending: boolean
  replyingTo: DirectMessage | null
  searchResults: Profile[]
  isSearching: boolean
  typingUsers: string[]   // usernames of people currently typing in active DM

  // Actions
  fetchConversations: (userId: string) => Promise<void>
  setActiveConversation: (conv: DirectConversation | null) => void
  openDmWithUser: (currentUserId: string, otherUserId: string) => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, senderId: string, content: string, replyToId?: string) => Promise<void>
  subscribeToConversation: (conversationId: string) => void
  unsubscribeFromConversation: () => void
  markAsRead: (conversationId: string, userId: string) => Promise<void>
  deleteMessage: (messageId: string, senderId: string) => void
  setReplyingTo: (msg: DirectMessage | null) => void
  searchUsers: (query: string, currentUserId: string) => Promise<void>
  clearSearch: () => void
  broadcastDmTyping: (conversationId: string, userId: string, username: string) => void
}

let dmSubscription: ReturnType<typeof supabase.channel> | null = null
// Per-user stop-typing timers for DMs
const dmTypingTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useDmStore = create<DmState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  replyingTo: null,
  searchResults: [],
  isSearching: false,
  typingUsers: [],

  fetchConversations: async (userId) => {
    set({ isLoadingConversations: true })
    try {
      const convs = await dmService.getConversations(userId)
      set({ conversations: convs })
    } catch (e) {
      console.error('fetchConversations error:', e)
    } finally {
      set({ isLoadingConversations: false })
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, messages: [], replyingTo: null, typingUsers: [] })
  },

  openDmWithUser: async (currentUserId, otherUserId) => {
    try {
      const conv = await dmService.getOrCreateConversation(currentUserId, otherUserId)
      set((state) => {
        const exists = state.conversations.find(c => c.id === conv.id)
        return {
          activeConversation: conv,
          messages: [],
          replyingTo: null,
          typingUsers: [],
          conversations: exists ? state.conversations : [conv, ...state.conversations],
        }
      })
      await get().fetchMessages(conv.id)
      get().subscribeToConversation(conv.id)
    } catch (e: any) {
      console.error('openDmWithUser error:', e?.message ?? e)
      alert(`DM Error: ${e?.message ?? JSON.stringify(e)}`)
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoadingMessages: true })
    try {
      const msgs = await dmService.getMessages(conversationId)
      set({ messages: msgs })
    } catch (e) {
      console.error('fetchMessages error:', e)
    } finally {
      set({ isLoadingMessages: false })
    }
  },

  sendMessage: async (conversationId, senderId, content, replyToId) => {
    set({ isSending: true })
    try {
      const msg = await dmService.sendMessage(conversationId, senderId, content, replyToId)
      set((state) => ({
        messages: [...state.messages, msg],
        replyingTo: null,
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? { ...c, last_message: content, last_message_at: msg.created_at }
            : c
        ),
      }))
    } catch (e: any) {
      console.error('sendMessage error:', e?.message ?? e)
      alert(`Send failed: ${e?.message ?? JSON.stringify(e)}`)
      throw e
    } finally {
      set({ isSending: false })
    }
  },

  /**
   * Broadcast typing presence in a DM conversation.
   * Auto-stops after 3s of no new keystrokes.
   */
  broadcastDmTyping: (conversationId, userId, username) => {
    if (!dmSubscription) return
    dmSubscription.track({ typing: true, userId, username, conversationId })
    if (dmTypingTimers[userId]) clearTimeout(dmTypingTimers[userId])
    dmTypingTimers[userId] = setTimeout(() => {
      dmSubscription?.untrack()
      delete dmTypingTimers[userId]
    }, 3000)
  },

  subscribeToConversation: (conversationId) => {
    get().unsubscribeFromConversation()
    set({ typingUsers: [] })

    dmSubscription = supabase
      .channel(`dm:${conversationId}`)
      // ── Postgres changes ──────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as DirectMessage
        const exists = get().messages.find(m => m.id === newMsg.id)
        if (exists) return
        const sender = await dmService.getProfile(newMsg.sender_id)
        const msgWithSender = { ...newMsg, sender }
        set((state) => ({
          messages: [...state.messages, msgWithSender],
          conversations: state.conversations.map(c =>
            c.id === conversationId
              ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
              : c
          ),
        }))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        set((state) => ({
          messages: state.messages.filter(m => m.id !== (payload.old as DirectMessage).id),
        }))
      })
      // ── Presence: typing indicators ───────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = dmSubscription?.presenceState() ?? {}
        const typers: string[] = []
        for (const presences of Object.values(state)) {
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

  unsubscribeFromConversation: () => {
    if (dmSubscription) {
      dmSubscription.untrack()
      dmSubscription.unsubscribe()
      dmSubscription = null
    }
    Object.values(dmTypingTimers).forEach(clearTimeout)
    set({ typingUsers: [] })
  },

  markAsRead: async (conversationId, userId) => {
    await dmService.markAsRead(conversationId, userId)
    set((state) => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    }))
  },

  deleteMessage: (messageId, senderId) => {
    dmService.deleteMessage(messageId, senderId)
    set((state) => ({
      messages: state.messages.filter(m => m.id !== messageId),
    }))
  },

  setReplyingTo: (msg) => set({ replyingTo: msg }),

  searchUsers: async (query, currentUserId) => {
    if (!query.trim()) { set({ searchResults: [] }); return }
    set({ isSearching: true })
    try {
      const results = await dmService.searchUsers(query, currentUserId)
      set({ searchResults: results })
    } catch (e) {
      console.error('searchUsers error:', e)
    } finally {
      set({ isSearching: false })
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),
}))
