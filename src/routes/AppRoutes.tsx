import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { ChatDashboard } from '../pages/ChatDashboard'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ChatLayout } from '../layouts/ChatLayout'
import { AppLayout } from '../layouts/AppLayout'
import { AdminDashboard } from '../pages/admin/AdminDashboard'
import { useAuthStore } from '../store/authStore'

export const AppRoutes = () => {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0F0F0F', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{
          width: '32px', height: '32px', border: '3px solid rgba(93,214,44,0.2)',
          borderTopColor: '#5DD62C', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'rgba(248,248,248,0.4)', fontSize: '13px' }}>Loading…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={user ? <Navigate to="/chat" /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to="/chat" />}
        />
        <Route
          path="/register"
          element={!user ? <LoginPage defaultRegister={true} /> : <Navigate to="/chat" />}
        />
        <Route
          element={user ? <ChatLayout /> : <Navigate to="/login" />}
        >
          <Route path="/chat" element={<ChatDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}