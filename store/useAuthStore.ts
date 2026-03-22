import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Admin {
  id: string
  username: string
  name: string
}

interface AuthStore {
  admin: Admin | null
  token: string | null
  setAuth: (admin: Admin, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      setAuth: (admin, token) => set({ admin, token }),
      clearAuth: () => set({ admin: null, token: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
    }
  )
)
