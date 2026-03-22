import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Client from '@/models/Client'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    const clients = await Client.find(query).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()
    const {
      name, phone, email, address, projectName, projectDescription,
      startDate, expectedEndDate, totalDealAmount, status, notes,
    } = body

    if (!name || !phone || !projectName || !startDate || !expectedEndDate || !totalDealAmount) {
      return NextResponse.json({ error: 'Name, phone, project name, dates and deal amount are required' }, { status: 400 })
    }

    const client = await Client.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      address: address?.trim(),
      projectName: projectName.trim(),
      projectDescription: projectDescription?.trim(),
      startDate: new Date(startDate),
      expectedEndDate: new Date(expectedEndDate),
      totalDealAmount: Number(totalDealAmount),
      status: status || 'ongoing',
      notes: notes?.trim(),
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
