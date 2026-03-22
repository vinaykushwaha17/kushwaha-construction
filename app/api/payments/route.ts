export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Payment from '@/models/Payment'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const workerId = searchParams.get('workerId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const query: Record<string, unknown> = {}
    if (workerId) query.worker = workerId
    if (status) query.status = status
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query.createdAt = { $gte: start, $lte: end }
    }

    const payments = await Payment.find(query)
      .populate('worker', 'name phone dailyWage')
      .sort({ createdAt: -1 })
      .lean()

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.netSalary, 0)

    return NextResponse.json({ payments, totalPending })
  } catch (error) {
    console.error('Get payments error:', error)
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
      workerId, periodStart, periodEnd, presentDays,
      dailyWage, grossSalary, totalAdvances, netSalary,
      manualOverride, type, notes
    } = body

    const finalAmount = manualOverride !== undefined ? manualOverride : netSalary

    const payment = await Payment.create({
      worker: workerId,
      amount: finalAmount,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      presentDays,
      dailyWage,
      grossSalary,
      totalAdvances: totalAdvances || 0,
      netSalary,
      manualOverride,
      type: type || 'weekly',
      status: 'pending',
      notes: notes?.trim(),
    })

    const populated = await payment.populate('worker', 'name phone')
    return NextResponse.json({ payment: populated }, { status: 201 })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
