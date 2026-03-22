export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Worker from '@/models/Worker'
import Attendance from '@/models/Attendance'
import Expense from '@/models/Expense'
import Payment from '@/models/Payment'
import type { Types } from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'worker'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const workerId = searchParams.get('workerId')

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    start.setHours(0, 0, 0, 0)
    const end = endDate ? new Date(endDate) : new Date()
    end.setHours(23, 59, 59, 999)

    if (type === 'worker') {
      const workerQuery = workerId ? { _id: workerId } : {}
      const workers = await Worker.find(workerQuery).lean<Array<{ _id: Types.ObjectId; name: string; phone: string; dailyWage: number }>>()
      const workerIds = workers.map(w => w._id)

      const [attendanceRecords, expenseRecords, paymentRecords] = await Promise.all([
        Attendance.find({ worker: { $in: workerIds }, date: { $gte: start, $lte: end } }).lean(),
        Expense.find({ worker: { $in: workerIds }, date: { $gte: start, $lte: end } }).lean(),
        Payment.find({ worker: { $in: workerIds }, createdAt: { $gte: start, $lte: end } }).lean(),
      ])

      const report = workers.map(worker => {
        const wId = worker._id.toString()
        const attendance = attendanceRecords.filter(a => a.worker.toString() === wId)
        const expenses = expenseRecords.filter(e => e.worker.toString() === wId)
        const payments = paymentRecords.filter(p => p.worker.toString() === wId)

        const presentDays = attendance.filter(a => a.status === 'present').length
        const halfDays = attendance.filter(a => a.status === 'half-day').length
        const absentDays = attendance.filter(a => a.status === 'absent').length
        const totalAdvances = expenses.filter(e => e.type === 'advance' || e.type === 'deduction')
          .reduce((sum, e) => sum + e.amount, 0)
        const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)

        return {
          worker,
          presentDays,
          halfDays,
          absentDays,
          totalAdvances,
          totalPaid,
          grossSalary: (presentDays + halfDays * 0.5) * worker.dailyWage,
        }
      })

      return NextResponse.json({ report, type: 'worker' })
    }

    if (type === 'expense') {
      const expenses = await Expense.find({ date: { $gte: start, $lte: end } })
        .populate('worker', 'name phone')
        .sort({ date: -1 })
        .lean()
      const total = expenses.reduce((sum, e) => sum + e.amount, 0)
      return NextResponse.json({ expenses, total, type: 'expense' })
    }

    if (type === 'weekly') {
      const payments = await Payment.find({
        createdAt: { $gte: start, $lte: end },
        type: 'weekly',
      })
        .populate('worker', 'name phone')
        .sort({ createdAt: -1 })
        .lean()

      const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
      const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.netSalary, 0)

      return NextResponse.json({ payments, totalPaid, totalPending, type: 'weekly' })
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
