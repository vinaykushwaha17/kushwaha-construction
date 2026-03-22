export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Worker from '@/models/Worker'
import Attendance from '@/models/Attendance'
import Expense from '@/models/Expense'
import type { Types } from 'mongoose'

// Calculate salary for all active workers for a given period
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { startDate, endDate, workerId } = await req.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Get workers
    const workerQuery = workerId ? { _id: workerId } : { status: 'active' }
    const workers = await Worker.find(workerQuery).lean<Array<{ _id: Types.ObjectId; name: string; phone: string; dailyWage: number; status: string }>>();

    // Get all attendance and expenses in one batch
    const workerIds = workers.map(w => w._id)

    const [attendanceRecords, expenseRecords] = await Promise.all([
      Attendance.find({
        worker: { $in: workerIds },
        date: { $gte: start, $lte: end },
      }).lean(),
      Expense.find({
        worker: { $in: workerIds },
        date: { $gte: start, $lte: end },
        type: { $in: ['advance', 'deduction'] },
      }).lean(),
    ])

    // Build maps for efficient lookup
    const attendanceByWorker = new Map<string, typeof attendanceRecords>()
    const expensesByWorker = new Map<string, typeof expenseRecords>()

    for (const a of attendanceRecords) {
      const key = a.worker.toString()
      if (!attendanceByWorker.has(key)) attendanceByWorker.set(key, [])
      attendanceByWorker.get(key)!.push(a)
    }

    for (const e of expenseRecords) {
      const key = e.worker.toString()
      if (!expensesByWorker.has(key)) expensesByWorker.set(key, [])
      expensesByWorker.get(key)!.push(e)
    }

    // Calculate salary for each worker
    const salaries = workers.map(worker => {
      const wId = worker._id.toString()
      const attendance = attendanceByWorker.get(wId) || []
      const expenses = expensesByWorker.get(wId) || []

      // Count present days: present=1, half-day=0.5, ot=1.5
      const presentDays = attendance.reduce((sum, a) => {
        if (a.status === 'present') return sum + 1
        if (a.status === 'half-day') return sum + 0.5
        if (a.status === 'ot') return sum + 1.5
        return sum
      }, 0)

      const grossSalary = presentDays * worker.dailyWage
      const totalAdvances = expenses.reduce((sum, e) => sum + e.amount, 0)
      const netSalary = Math.max(0, grossSalary - totalAdvances)

      return {
        worker,
        presentDays,
        grossSalary,
        totalAdvances,
        netSalary,
        attendanceDetails: attendance,
        expenseDetails: expenses,
      }
    })

    return NextResponse.json({ salaries, period: { start, end } })
  } catch (error) {
    console.error('Calculate salary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
