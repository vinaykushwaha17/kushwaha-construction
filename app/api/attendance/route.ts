export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Worker from '@/models/Worker'
import type { Types } from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const workerId = searchParams.get('workerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const query: Record<string, unknown> = {}

    if (date) {
      query.date = { $gte: new Date(date + 'T00:00:00.000Z'), $lte: new Date(date + 'T23:59:59.999Z') }
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate + 'T00:00:00.000Z'), $lte: new Date(endDate + 'T23:59:59.999Z') }
    }

    if (workerId) query.worker = workerId

    const attendance = await Attendance.find(query)
      .populate('worker', 'name phone dailyWage status')
      .sort({ date: -1 })
      .lean()

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Get attendance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()

    // Support bulk attendance: [{ workerId, date, status }]
    if (Array.isArray(body)) {
      const operations = body.map(({ workerId, date, status, notes }) => {
        const d = new Date(date + 'T00:00:00.000Z')
        return {
          updateOne: {
            filter: { worker: workerId, date: d },
            update: { $set: { worker: workerId, date: d, status, notes } },
            upsert: true,
          },
        }
      })
      await Attendance.bulkWrite(operations)
      return NextResponse.json({ success: true })
    }

    // Single attendance
    const { workerId, date, status, notes } = body
    if (!workerId || !date || !status) {
      return NextResponse.json({ error: 'workerId, date, and status are required' }, { status: 400 })
    }

    const d = new Date(date + 'T00:00:00.000Z')

    const attendance = await Attendance.findOneAndUpdate(
      { worker: workerId, date: d },
      { worker: workerId, date: d, status, notes },
      { upsert: true, new: true }
    )

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Create attendance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET attendance summary for a date (all active workers with their status)
export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { date } = await req.json()

    const start = new Date(date + 'T00:00:00.000Z')
    const end = new Date(date + 'T23:59:59.999Z')

    const [workers, attendance] = await Promise.all([
      Worker.find({ status: 'active' }).lean<Array<{ _id: Types.ObjectId; name: string; phone: string; dailyWage: number; status: string }>>(),
      Attendance.find({ date: { $gte: start, $lte: end } }).lean<Array<{ _id: Types.ObjectId; worker: Types.ObjectId; date: Date; status: string }>>(),
    ])

    const attendanceMap = new Map(
      attendance.map(a => [a.worker.toString(), a])
    )

    const result = workers.map(worker => ({
      worker,
      attendance: attendanceMap.get(worker._id.toString()) || null,
    }))

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Get attendance summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
