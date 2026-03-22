'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CalendarCheck, Wallet, CreditCard, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardStats {
  totalWorkers: number
  activeWorkers: number
  presentToday: number
  totalExpenses: number
  pendingSalary: number
}

interface RecentExpense {
  _id: string
  worker: { name: string }
  amount: number
  reason: string
  date: string
  type: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/api/dashboard')
        const data = await res.json()
        setStats(data.stats)
        setRecentExpenses(data.recentExpenses || [])
      } catch (error) {
        console.error('Dashboard fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const statCards = [
    {
      title: 'Total Workers',
      value: stats?.totalWorkers ?? '—',
      sub: `${stats?.activeWorkers ?? 0} active`,
      icon: Users,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      href: '/workers',
    },
    {
      title: 'Present Today',
      value: stats?.presentToday ?? '—',
      sub: `of ${stats?.activeWorkers ?? 0} active`,
      icon: CalendarCheck,
      color: 'bg-green-500',
      bg: 'bg-green-50',
      href: '/attendance',
    },
    {
      title: 'Total Advances',
      value: stats ? formatCurrency(stats.totalExpenses) : '—',
      sub: 'all time',
      icon: Wallet,
      color: 'bg-orange-500',
      bg: 'bg-orange-50',
      href: '/expenses',
    },
    {
      title: 'Pending Salary',
      value: stats ? formatCurrency(stats.pendingSalary) : '—',
      sub: 'to be paid',
      icon: CreditCard,
      color: 'bg-purple-500',
      bg: 'bg-purple-50',
      href: '/payments',
    },
  ]

  const quickLinks = [
    { href: '/attendance', label: 'Mark Attendance', icon: CalendarCheck, color: 'text-green-600 bg-green-50 border-green-100' },
    { href: '/expenses', label: 'Add Advance', icon: Wallet, color: 'text-orange-600 bg-orange-50 border-orange-100' },
    { href: '/salary', label: 'Calculate Salary', icon: TrendingUp, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { href: '/payments', label: 'Process Payment', icon: CreditCard, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending salary alert */}
      {stats && stats.pendingSalary > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Pending salary: {formatCurrency(stats.pendingSalary)}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">Process payments to clear dues</p>
          </div>
          <Link href="/payments" className="ml-auto text-orange-700 hover:text-orange-900">
            <ArrowRight size={18} />
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link key={card.title} href={card.href} className="card hover:shadow-md transition-shadow group">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.title}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${link.color} hover:shadow-sm transition-all`}
            >
              <link.icon size={24} />
              <span className="text-xs font-medium text-center">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Advances */}
      {recentExpenses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Advances</h2>
            <Link href="/expenses" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card">
            <div className="space-y-3">
              {recentExpenses.map(expense => (
                <div key={expense._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.worker?.name}</p>
                    <p className="text-xs text-gray-500">{expense.reason} · {formatDate(expense.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">{formatCurrency(expense.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
