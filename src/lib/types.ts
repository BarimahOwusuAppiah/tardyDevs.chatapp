export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
}

export interface Channel {
  id: string
  name: string
  created_at: string
}

export interface Message {
  id: string
  content: string
  user_id: string
  channel_id: string
  created_at: string
  profiles?: {
    username: string
    avatar_url?: string
  }
}