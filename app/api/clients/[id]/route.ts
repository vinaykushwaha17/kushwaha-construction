export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Client from '@/models/Client'
import ClientPayment from '@/models/ClientPayment'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const [client, payments] = await Promise.all([
      Client.findById(params.id).lean(),
      ClientPayment.find({ client: params.id }).sort({ date: -1 }).lean(),
    ])

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({ client, payments, totalReceived })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()

    // Convert date strings and numbers
    if (body.startDate) body.startDate = new Date(body.startDate)
    if (body.expectedEndDate) body.expectedEndDate = new Date(body.expectedEndDate)
    if (body.actualEndDate) body.actualEndDate = new Date(body.actualEndDate)
    if (body.totalDealAmount) body.totalDealAmount = Number(body.totalDealAmount)

    const client = await Client.findByIdAndUpdate(params.id, body, { new: true })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    return NextResponse.json({ client })
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    await Client.findByIdAndDelete(params.id)
    await ClientPayment.deleteMany({ client: params.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
