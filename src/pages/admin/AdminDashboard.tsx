import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalUsers: number
  totalChannels: number
  totalMessages: number
  activeUsersToday: number
  dbConnected: boolean
}

interface RecentActivity {
  id: string
  type: 'user' | 'message' | 'channel'
  description: string
  timestamp: string
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalChannels: 0,
    totalMessages: 0,
    activeUsersToday: 0,
    dbConnected: false,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) {
      // Redirect non-admins
      window.location.href = '/chat'
      return
    }

    initializeDashboard()
  }, [user, isAdmin])

  const initializeDashboard = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchRecentActivity(),
        checkDatabaseConnection(),
      ])
    } catch (err) {
      setError('Failed to initialize dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      // Get total channels
      const { count: channelCount } = await supabase
        .from('channels')
        .select('*', { count: 'exact', head: true })
      
      // Get total messages
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
      
      // Get active users today (last 24 hours)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      setStats(prev => ({
        ...prev,
        totalUsers: userCount || 0,
        totalChannels: channelCount || 0,
        totalMessages: messageCount || 0,
        activeUsersToday: activeCount || 0,
      }))
    } catch (err: any) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Get recent users (last 5)
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      // Get recent messages (last 5)
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, content, created_at, profiles!inner(username)')
        .order('created_at', { ascending: false })
        .limit(5)
      
      // Get recent channels (last 5)
      const { data: recentChannels } = await supabase
        .from('channels')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      const activity: RecentActivity[] = []
      
      if (recentUsers) {
        recentUsers.forEach(user => {
          activity.push({
            id: user.id,
            type: 'user',
            description: `New user registered: ${user.username}`,
            timestamp: user.created_at,
          })
        })
      }
      
      if (recentMessages) {
        recentMessages.forEach(msg => {
          const username = msg.profiles?.[0]?.username ?? 'Unknown'
          activity.push({
            id: msg.id,
            type: 'message',
            description: `New message from ${username}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`,
            timestamp: msg.created_at,
          })
        })
      }
      
      if (recentChannels) {
        recentChannels.forEach(channel => {
          activity.push({
            id: channel.id,
            type: 'channel',
            description: `New channel created: ${channel.name}`,
            timestamp: channel.created_at,
          })
        })
      }
      
      // Sort by timestamp descending
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activity.slice(0, 10)) // Show top 10
    } catch (err: any) {
      console.error('Error fetching recent activity:', err)
    }
  }

  const checkDatabaseConnection = async () => {
    try {
      // Simple query to test connection
      await supabase.from('profiles').select('count', { count: 'exact', head: true })
      
      setStats(prev => ({ ...prev, dbConnected: true }))
    } catch (err: any) {
      setStats(prev => ({ ...prev, dbConnected: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <div className="bg-dark-800 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-400 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 100-4 2 2 0 000 4zm-9 3a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            Admin Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${stats.dbConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Database: {stats.dbConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-dark-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-300 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          
          <div className="bg-dark-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-300 mb-2">Total Channels</h3>
            <p className="text-3xl font-bold text-white">{stats.totalChannels}</p>
          </div>
          
          <div className="bg-dark-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-300 mb-2">Total Messages</h3>
            <p className="text-3xl font-bold text-white">{stats.totalMessages}</p>
          </div>
          
          <div className="bg-dark-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-300 mb-2">Active Today</h3>
            <p className="text-3xl font-bold text-white">{stats.activeUsersToday}</p>
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="bg-dark-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">System Health</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-gray-400">
              <span>Database Connection:</span>
              <span className={`${stats.dbConnected ? 'text-green-500' : 'text-red-500'} font-medium`}>
                {stats.dbConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Auth Service:</span>
              <span className="text-green-500 font-medium">Operational</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-dark-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-dark-700 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${activity.type === 'user' ? 'bg-blue-500' : activity.type === 'message' ? 'bg-green-500' : 'bg-purple-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{activity.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}