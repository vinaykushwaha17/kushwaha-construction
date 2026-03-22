'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils'

interface Worker { _id: string; name: string; phone: string }
interface Expense {
  _id: string
  worker: Worker
  amount: number
  reason: string
  date: string
  type: 'advance' | 'deduction' | 'bonus'
  notes?: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState({ startDate: '', endDate: '', workerId: '' })
  const [form, setForm] = useState({
    workerId: '', amount: '', reason: '', date: formatDateInput(new Date()), type: 'advance', notes: ''
  })

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.workerId) params.set('workerId', filter.workerId)
      if (filter.startDate) params.set('startDate', filter.startDate)
      if (filter.endDate) params.set('endDate', filter.endDate)
      const res = await api.get(`/api/expenses?${params}`)
      const data = await res.json()
      setExpenses(data.expenses || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    api.get('/api/workers?status=active&limit=200').then(r => r.json()).then(d => setWorkers(d.workers || []))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.workerId || !form.amount || !form.reason) {
      toast.error('Worker, amount and reason are required')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/api/expenses', form)
      if (!res.ok) { toast.error('Failed to save'); return }
      toast.success('Advance recorded!')
      setShowModal(false)
      setForm({ workerId: '', amount: '', reason: '', date: formatDateInput(new Date()), type: 'advance', notes: '' })
      fetchExpenses()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/expenses/${id}`)
      if (!res.ok) { toast.error('Failed to delete'); return }
      toast.success('Record deleted')
      setDeleteId(null)
      fetchExpenses()
    } catch {
      toast.error('Network error')
    }
  }

  const typeColors: Record<string, string> = {
    advance: 'bg-orange-100 text-orange-800',
    deduction: 'bg-red-100 text-red-800',
    bonus: 'bg-green-100 text-green-800',
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" className="input w-36" value={filter.startDate} onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" className="input w-36" value={filter.endDate} onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Worker</label>
          <select className="input w-40" value={filter.workerId} onChange={e => setFilter(f => ({ ...f, workerId: e.target.value }))}>
            <option value="">All Workers</option>
            {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 ml-auto">
          <Plus size={16} /> Add Advance
        </button>
      </div>

      {/* Total */}
      <div className="card flex items-center gap-3 bg-orange-50 border-orange-100">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
          <IndianRupee size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-orange-700">Total Advances Given</p>
          <p className="text-2xl font-bold text-orange-900">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card animate-pulse h-48" />
      ) : (
        <>
          {/* Desktop */}
          <div className="card hidden md:block p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Worker</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{exp.worker?.name}</td>
                    <td className="px-4 py-3 font-semibold text-orange-600">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{exp.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[exp.type]}`}>{exp.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleteId(exp._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {expenses.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">No records found</div>
            ) : expenses.map(exp => (
              <div key={exp._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{exp.worker?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{exp.reason} · {formatDate(exp.date)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${typeColors[exp.type]}`}>{exp.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-600">{formatCurrency(exp.amount)}</span>
                    <button onClick={() => setDeleteId(exp._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Add Advance / Deduction</h2></div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker *</label>
                <select className="input" value={form.workerId} onChange={e => setForm(f => ({ ...f, workerId: e.target.value }))}>
                  <option value="">Select worker</option>
                  {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input className="input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Medical emergency" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="advance">Advance</option>
                  <option value="deduction">Deduction</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input h-16 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <p className="font-semibold text-gray-900 mb-1">Delete this record?</p>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
