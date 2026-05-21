import { useState, useCallback } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { AuthProvider } from './hooks/useAuth'
import { SplashScreen } from './components/SplashScreen'
import './index.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
  }, [])

  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} duration={4000} />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
