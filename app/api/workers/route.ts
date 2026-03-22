export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Worker from '@/models/Worker'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Worker.countDocuments(query)
    const workers = await Worker.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return NextResponse.json({ workers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Get workers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()
    const { name, phone, dailyWage, joiningDate, status, address, notes } = body

    if (!name || !phone || !dailyWage || !joiningDate) {
      return NextResponse.json({ error: 'Name, phone, daily wage, and joining date are required' }, { status: 400 })
    }

    const worker = await Worker.create({
      name: name.trim(),
      phone: phone.trim(),
      dailyWage: Number(dailyWage),
      joiningDate: new Date(joiningDate),
      status: status || 'active',
      address: address?.trim(),
      notes: notes?.trim(),
    })

    return NextResponse.json({ worker }, { status: 201 })
  } catch (error) {
    console.error('Create worker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
