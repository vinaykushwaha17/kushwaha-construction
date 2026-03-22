'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Clock, IndianRupee, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils'

interface Worker { _id: string; name: string; phone: string; dailyWage: number }
interface Payment {
  _id: string
  worker: Worker
  amount: number
  periodStart: string
  periodEnd: string
  presentDays: number
  grossSalary: number
  totalAdvances: number
  netSalary: number
  manualOverride?: number
  type: string
  status: 'paid' | 'pending'
  paidAt?: string
  notes?: string
  createdAt: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerFilter, setWorkerFilter] = useState('')
  const [totalPending, setTotalPending] = useState(0)
  const [showSpecialModal, setShowSpecialModal] = useState(false)
  const [specialForm, setSpecialForm] = useState({ workerId: '', amount: '', reason: '', type: 'festival' })
  const [saving, setSaving] = useState(false)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (workerFilter) params.set('workerId', workerFilter)
      const res = await api.get(`/api/payments?${params}`)
      const data = await res.json()
      setPayments(data.payments || [])
      setTotalPending(data.totalPending || 0)
    } catch {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, workerFilter])

  useEffect(() => { fetchPayments() }, [fetchPayments])
  useEffect(() => {
    api.get('/api/workers?status=active&limit=200').then(r => r.json()).then(d => setWorkers(d.workers || []))
  }, [])

  const markPaid = async (id: string) => {
    try {
      const res = await api.put(`/api/payments/${id}`, { status: 'paid' })
      if (!res.ok) { toast.error('Failed to update'); return }
      toast.success('Payment marked as paid!')
      fetchPayments()
    } catch {
      toast.error('Network error')
    }
  }

  const deletePayment = async (id: string) => {
    if (!confirm('Delete this payment record?')) return
    try {
      await api.delete(`/api/payments/${id}`)
      toast.success('Deleted')
      fetchPayments()
    } catch {
      toast.error('Network error')
    }
  }

  const addSpecialPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!specialForm.workerId || !specialForm.amount) {
      toast.error('Worker and amount required')
      return
    }
    setSaving(true)
    try {
      const today = formatDateInput(new Date())
      const res = await api.post('/api/payments', {
        workerId: specialForm.workerId,
        periodStart: today,
        periodEnd: today,
        presentDays: 0,
        dailyWage: 0,
        grossSalary: Number(specialForm.amount),
        totalAdvances: 0,
        netSalary: Number(specialForm.amount),
        type: specialForm.type,
        notes: specialForm.reason,
      })
      if (!res.ok) { toast.error('Failed to create'); return }
      toast.success('Special payment created!')
      setShowSpecialModal(false)
      fetchPayments()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const pendingPayments = payments.filter(p => p.status === 'pending')
  const paidPayments = payments.filter(p => p.status === 'paid')

  return (
    <div className="space-y-4">
      {/* Summary */}
      {totalPending > 0 && (
        <div className="card bg-orange-50 border-orange-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-orange-700">Total Pending Salary</p>
            <p className="text-2xl font-bold text-orange-900">{formatCurrency(totalPending)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
        <select className="input w-40" value={workerFilter} onChange={e => setWorkerFilter(e.target.value)}>
          <option value="">All Workers</option>
          {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
        </select>
        <button onClick={() => setShowSpecialModal(true)} className="btn-primary flex items-center gap-2 ml-auto">
          <Plus size={16} /> Special Payment
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="card text-center py-12">
          <IndianRupee size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payment records</p>
          <p className="text-sm text-gray-400 mt-1">Calculate salaries to generate payment records</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending section */}
          {pendingPayments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                <Clock size={14} /> Pending ({pendingPayments.length})
              </h3>
              <div className="space-y-2">
                {pendingPayments.map(pay => (
                  <PaymentCard key={pay._id} payment={pay} onMarkPaid={markPaid} onDelete={deletePayment} />
                ))}
              </div>
            </div>
          )}

          {/* Paid section */}
          {paidPayments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle2 size={14} /> Paid ({paidPayments.length})
              </h3>
              <div className="space-y-2">
                {paidPayments.map(pay => (
                  <PaymentCard key={pay._id} payment={pay} onMarkPaid={markPaid} onDelete={deletePayment} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Special Payment Modal */}
      {showSpecialModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="font-semibold">Add Special Payment</h2></div>
            <form onSubmit={addSpecialPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker *</label>
                <select className="input" value={specialForm.workerId} onChange={e => setSpecialForm(f => ({ ...f, workerId: e.target.value }))}>
                  <option value="">Select worker</option>
                  {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" className="input" placeholder="Amount" value={specialForm.amount} onChange={e => setSpecialForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="input" value={specialForm.type} onChange={e => setSpecialForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="festival">Festival Payout</option>
                  <option value="special">Special Payment</option>
                  <option value="advance">Advance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input className="input" placeholder="e.g. Diwali bonus" value={specialForm.reason} onChange={e => setSpecialForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSpecialModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentCard({ payment: pay, onMarkPaid, onDelete }: {
  payment: Payment
  onMarkPaid: (id: string) => void
  onDelete: (id: string) => void
}) {
  const finalAmount = pay.manualOverride !== undefined ? pay.manualOverride : pay.netSalary

  return (
    <div className={`card border-l-4 ${pay.status === 'paid' ? 'border-l-green-500' : 'border-l-orange-500'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{pay.worker?.name}</p>
            <span className={pay.status === 'paid' ? 'badge-paid' : 'badge-pending'}>{pay.status}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{pay.type}</span>
          </div>
          {pay.type === 'weekly' && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(pay.periodStart)} — {formatDate(pay.periodEnd)} · {pay.presentDays} days
            </p>
          )}
          {pay.notes && <p className="text-xs text-gray-400 mt-0.5">{pay.notes}</p>}
          {pay.paidAt && <p className="text-xs text-green-600 mt-0.5">Paid on {formatDate(pay.paidAt)}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg text-gray-900">{formatCurrency(finalAmount)}</p>
          {pay.totalAdvances > 0 && (
            <p className="text-xs text-red-500">-{formatCurrency(pay.totalAdvances)} advances</p>
          )}
        </div>
      </div>
      {pay.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => onMarkPaid(pay._id)} className="btn-success flex-1 text-sm py-1.5 flex items-center justify-center gap-1">
            <CheckCircle2 size={14} /> Mark Paid
          </button>
          <button onClick={() => onDelete(pay._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
