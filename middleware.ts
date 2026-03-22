import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/seed']

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow Next.js internals and all static public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/workbox-') ||
    pathname === '/logo.png' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|css|js)$/) !== null
  ) {
    return NextResponse.next()
  }

  // Get token from header or cookie
  const authHeader = req.headers.get('authorization')
  const cookieToken = req.cookies.get('token')?.value
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp).*)'],
}
