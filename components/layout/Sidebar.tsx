'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, CalendarCheck, Wallet,
  CreditCard, BarChart3, LogOut, X, BanknoteIcon, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/expenses', label: 'Advances', icon: Wallet },
  { href: '/salary', label: 'Salary', icon: BanknoteIcon },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/clients', label: 'Clients', icon: Building2 },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout', {})
    } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-800 z-30 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                className="w-full h-full object-contain"
                onError={e => {
                  const el = e.currentTarget
                  el.style.display = 'none'
                  const next = el.nextElementSibling as HTMLElement
                  if (next) next.style.display = 'flex'
                }}
              />
              <div style={{ display: 'none' }} className="w-full h-full items-center justify-center bg-blue-600 rounded-lg">
                <span className="text-white text-xs font-bold">KC</span>
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Kushwaha</p>
              <p className="text-blue-300 text-xs">Construction</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
