'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/workers': 'Workers',
  '/attendance': 'Attendance',
  '/expenses': 'Advances & Expenses',
  '/salary': 'Salary Calculation',
  '/payments': 'Payments',
  '/clients': 'Client Management',
  '/reports': 'Reports',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => k !== '/' && pathname.startsWith(k)) || '/'] || 'Kushwaha Construction'

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
