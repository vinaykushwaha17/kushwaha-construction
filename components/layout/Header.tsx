'use client'

import { Menu, Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-semibold text-gray-900 text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </header>
  )
}
