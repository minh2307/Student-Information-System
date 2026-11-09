import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StudentAdvisorWidget } from './StudentAdvisorWidget'
import { useAuthStore } from '../store/authStore'

export const MainLayout = () => {
  const { user } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Tự động đóng Mobile Drawer khi chuyển trang hoặc điều hướng
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        mobileOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header 
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} 
        />
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 overflow-y-auto touch-scroll">
          <Outlet />
        </main>
      </div>
      {user?.role === 'STUDENT' && <StudentAdvisorWidget />}
    </div>
  )
}
