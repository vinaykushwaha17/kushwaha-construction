export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Payment from '@/models/Payment'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()

    // Mark as paid
    if (body.status === 'paid') {
      const payment = await Payment.findByIdAndUpdate(
        params.id,
        { status: 'paid', paidAt: new Date(), ...body },
        { new: true }
      ).populate('worker', 'name phone')

      if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      return NextResponse.json({ payment })
    }

    const payment = await Payment.findByIdAndUpdate(params.id, body, { new: true })
      .populate('worker', 'name phone')
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Update payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    await Payment.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
