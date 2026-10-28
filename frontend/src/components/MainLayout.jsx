import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StudentAdvisorWidget } from './StudentAdvisorWidget'
import { useAuthStore } from '../store/authStore'

export const MainLayout = () => {
  const { user } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        mobileOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} 
        />
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {user?.role === 'STUDENT' && <StudentAdvisorWidget />}
    </div>
  )
}
