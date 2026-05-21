import React from 'react'
import { Outlet } from 'react-router-dom'

export const AppLayout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#0F0F0F' }}>
      <Outlet />
    </div>
  )
}