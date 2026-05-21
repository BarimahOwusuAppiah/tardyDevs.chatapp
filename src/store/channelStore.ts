import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface Channel {
  id: string
  name: string
  description?: string
  created_at: string
}

interface ChannelState {
  channels: Channel[]
  activeChannel: Channel | null
  isCreating: boolean
  setChannels: (channels: Channel[]) => void
  setActiveChannel: (channel: Channel | null) => void
  fetchChannels: () => Promise<void>
  createChannel: (name: string) => Promise<void>
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  activeChannel: null,
  isCreating: false,

  setChannels: (channels) => set({ channels }),
  setActiveChannel: (channel) => set({ activeChannel: channel }),

  fetchChannels: async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) {
      set({ channels: data })
      if (!get().activeChannel && data.length > 0) {
        set({ activeChannel: data[0] })
      }
    }
  },

  createChannel: async (name: string) => {
    set({ isCreating: true })
    const clean = name.trim().toLowerCase().replace(/\s+/g, '-')
    const { data, error } = await supabase
      .from('channels')
      .insert({ name: clean })
      .select()
      .single()
    set({ isCreating: false })
    if (!error && data) {
      set((state) => ({ channels: [...state.channels, data], activeChannel: data }))
    } else if (error) {
      throw error
    }
  },
}))
