export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import ClientPayment from '@/models/ClientPayment'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const payments = await ClientPayment.find({ client: params.id }).sort({ date: -1 }).lean()
    const total = payments.reduce((sum, p) => sum + p.amount, 0)
    return NextResponse.json({ payments, total })
  } catch (error) {
    console.error('Get client payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()
    const { amount, date, type, mode, reference, notes } = body

    if (!amount || !date) {
      return NextResponse.json({ error: 'Amount and date are required' }, { status: 400 })
    }

    const payment = await ClientPayment.create({
      client: params.id,
      amount: Number(amount),
      date: new Date(date),
      type: type || 'installment',
      mode: mode || 'cash',
      reference: reference?.trim(),
      notes: notes?.trim(),
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Create client payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')
    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 })

    await ClientPayment.findByIdAndDelete(paymentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete client payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
