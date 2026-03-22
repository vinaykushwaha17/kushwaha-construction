// API client with automatic token injection

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    window.location.href = '/login'
  }

  return res
}

export const api = {
  get: (url: string) => apiFetch(url),
  post: (url: string, body: unknown) =>
    apiFetch(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url: string, body: unknown) =>
    apiFetch(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url: string) => apiFetch(url, { method: 'DELETE' }),
}
