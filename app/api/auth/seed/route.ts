import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import Admin from '@/models/Admin'

// One-time seed route to create the initial admin
// Call GET /api/auth/seed to create admin if none exists
export async function GET() {
  try {
    await connectDB()

    const existing = await Admin.findOne({})
    if (existing) {
      return NextResponse.json({ message: 'Admin already exists' })
    }

    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const hashedPassword = await hashPassword(password)

    await Admin.create({
      username,
      password: hashedPassword,
      name: 'Kushwaha Admin',
    })

    return NextResponse.json({ message: 'Admin created successfully', username })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed admin' }, { status: 500 })
  }
}
