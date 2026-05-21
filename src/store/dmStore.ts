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
}

let dmSubscription: ReturnType<typeof supabase.channel> | null = null

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
    set({ activeConversation: conv, messages: [], replyingTo: null })
  },

  openDmWithUser: async (currentUserId, otherUserId) => {
    try {
      const conv = await dmService.getOrCreateConversation(currentUserId, otherUserId)
      // Add to conversations list if not already there
      set((state) => {
        const exists = state.conversations.find(c => c.id === conv.id)
        return {
          activeConversation: conv,
          messages: [],
          replyingTo: null,
          conversations: exists ? state.conversations : [conv, ...state.conversations],
        }
      })
      // Load messages
      await get().fetchMessages(conv.id)
      get().subscribeToConversation(conv.id)
    } catch (e) {
      console.error('openDmWithUser error:', e)
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
        // Update last message preview in conversation list
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? { ...c, last_message: content, last_message_at: msg.created_at }
            : c
        ),
      }))
    } catch (e) {
      console.error('sendMessage error:', e)
      throw e
    } finally {
      set({ isSending: false })
    }
  },

  subscribeToConversation: (conversationId) => {
    get().unsubscribeFromConversation()
    dmSubscription = supabase
      .channel(`dm:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as DirectMessage
        // Don't add if we already have it (optimistic update)
        const exists = get().messages.find(m => m.id === newMsg.id)
        if (exists) return
        // Fetch sender profile
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
      .subscribe()
  },

  unsubscribeFromConversation: () => {
    if (dmSubscription) {
      dmSubscription.unsubscribe()
      dmSubscription = null
    }
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
