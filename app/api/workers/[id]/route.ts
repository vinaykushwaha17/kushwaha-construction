export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthFromRequest } from '@/lib/auth'
import Worker from '@/models/Worker'
import Attendance from '@/models/Attendance'
import Expense from '@/models/Expense'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const worker = await Worker.findById(params.id).lean()
    if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })

    return NextResponse.json({ worker })
  } catch (error) {
    console.error('Get worker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()
    const { name, phone, dailyWage, joiningDate, status, address, notes } = body

    const worker = await Worker.findByIdAndUpdate(
      params.id,
      {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(dailyWage !== undefined && { dailyWage: Number(dailyWage) }),
        ...(joiningDate && { joiningDate: new Date(joiningDate) }),
        ...(status && { status }),
        ...(address !== undefined && { address: address?.trim() }),
        ...(notes !== undefined && { notes: notes?.trim() }),
      },
      { new: true }
    )

    if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    return NextResponse.json({ worker })
  } catch (error) {
    console.error('Update worker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    // Soft delete: just mark as inactive, or hard delete with cascade
    await Worker.findByIdAndDelete(params.id)
    // Also remove related attendance and expenses
    await Attendance.deleteMany({ worker: params.id })
    await Expense.deleteMany({ worker: params.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete worker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
