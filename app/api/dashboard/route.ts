import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Worker from '@/models/Worker'
import Attendance from '@/models/Attendance'
import Expense from '@/models/Expense'
import Payment from '@/models/Payment'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [
      totalWorkers,
      activeWorkers,
      presentToday,
      totalExpenses,
      pendingPayments,
      recentExpenses,
    ] = await Promise.all([
      Worker.countDocuments({}),
      Worker.countDocuments({ status: 'active' }),
      Attendance.countDocuments({
        date: { $gte: today, $lte: todayEnd },
        status: 'present',
      }),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$netSalary' } } }
      ]),
      Expense.find({})
        .populate('worker', 'name')
        .sort({ date: -1 })
        .limit(5)
        .lean(),
    ])

    return NextResponse.json({
      stats: {
        totalWorkers,
        activeWorkers,
        presentToday,
        totalExpenses: totalExpenses[0]?.total || 0,
        pendingSalary: pendingPayments[0]?.total || 0,
      },
      recentExpenses,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
