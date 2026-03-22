import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Expense from '@/models/Expense'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const workerId = searchParams.get('workerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')

    const query: Record<string, unknown> = {}
    if (workerId) query.worker = workerId
    if (type) query.type = type
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query.date = { $gte: start, $lte: end }
    }

    const expenses = await Expense.find(query)
      .populate('worker', 'name phone')
      .sort({ date: -1 })
      .lean()

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({ expenses, total })
  } catch (error) {
    console.error('Get expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()
    const { workerId, amount, reason, date, type, notes } = body

    if (!workerId || !amount || !reason || !date) {
      return NextResponse.json({ error: 'Worker, amount, reason, and date are required' }, { status: 400 })
    }

    const expense = await Expense.create({
      worker: workerId,
      amount: Number(amount),
      reason: reason.trim(),
      date: new Date(date),
      type: type || 'advance',
      notes: notes?.trim(),
    })

    const populated = await expense.populate('worker', 'name phone')
    return NextResponse.json({ expense: populated }, { status: 201 })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
