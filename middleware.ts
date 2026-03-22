import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/seed']

const STATIC_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.otf', '.css', '.js', '.map'
]

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function verifyJWT(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const secret = process.env.JWT_SECRET || 'fallback-secret'
    const keyData = new TextEncoder().encode(secret)

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signingInput = new TextEncoder().encode(parts[0] + '.' + parts[1])
    const signature = base64UrlDecode(parts[2])

    const valid = await crypto.subtle.verify('HMAC', key, signature.buffer as ArrayBuffer, signingInput)
    if (!valid) return false

    // Check expiry
    const payloadJson = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payloadJson.exp && payloadJson.exp < Math.floor(Date.now() / 1000)) return false

    return true
  } catch {
    return false
  }
}

function isStaticFile(pathname: string): boolean {
  for (const ext of STATIC_EXTENSIONS) {
    if (pathname.endsWith(ext)) return true
  }
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow Next.js internals
  if (pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Allow static files by extension
  if (isStaticFile(pathname)) {
    return NextResponse.next()
  }

  // Allow known static paths
  if (
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/workbox-')
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  for (const path of PUBLIC_PATHS) {
    if (pathname.startsWith(path)) {
      return NextResponse.next()
    }
  }

  // Get token from header or cookie
  const authHeader = req.headers.get('authorization')
  const cookieToken = req.cookies.get('token')?.value
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : cookieToken

  const isValid = token ? await verifyJWT(token) : false

  // API routes return 401
  if (pathname.startsWith('/api/')) {
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Page routes redirect to login
  if (!isValid) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
