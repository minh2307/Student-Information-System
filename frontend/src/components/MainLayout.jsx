import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StudentAdvisorWidget } from './StudentAdvisorWidget'
import { useAuthStore } from '../store/authStore'

export const MainLayout = () => {
  const { user } = useAuthStore()

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {user?.role === 'STUDENT' && <StudentAdvisorWidget />}
    </div>
  )
}
