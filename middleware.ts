import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/seed']

const STATIC_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.otf', '.css', '.js', '.map'
]

function getJWTSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')
}

async function verifyJWT(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJWTSecret())
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

  // Allow known public paths and prefixes
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
