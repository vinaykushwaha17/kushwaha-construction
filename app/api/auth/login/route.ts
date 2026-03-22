import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { comparePassword, signToken } from '@/lib/auth'
import Admin from '@/models/Admin'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() })
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await comparePassword(password, admin.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ id: admin._id.toString(), username: admin.username, name: admin.name })

    const response = NextResponse.json({
      success: true,
      token,
      admin: { id: admin._id, username: admin.username, name: admin.name },
    })

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
