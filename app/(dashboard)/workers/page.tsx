'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Phone, IndianRupee, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateInput, cn } from '@/lib/utils'

interface Worker {
  _id: string
  name: string
  phone: string
  dailyWage: number
  joiningDate: string
  status: 'active' | 'inactive'
  address?: string
  notes?: string
}

const EMPTY_FORM = {
  name: '', phone: '', dailyWage: '', joiningDate: '',
  status: 'active' as 'active' | 'inactive', address: '', notes: ''
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editWorker, setEditWorker] = useState<Worker | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchWorkers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/api/workers?${params}`)
      const data = await res.json()
      setWorkers(data.workers || [])
    } catch {
      toast.error('Failed to load workers')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const timer = setTimeout(fetchWorkers, 300)
    return () => clearTimeout(timer)
  }, [fetchWorkers])

  const openAdd = () => {
    setEditWorker(null)
    setForm({ ...EMPTY_FORM, joiningDate: formatDateInput(new Date()) })
    setShowModal(true)
  }

  const openEdit = (worker: Worker) => {
    setEditWorker(worker)
    setForm({
      name: worker.name,
      phone: worker.phone,
      dailyWage: String(worker.dailyWage),
      joiningDate: formatDateInput(new Date(worker.joiningDate)),
      status: worker.status,
      address: worker.address || '',
      notes: worker.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.dailyWage || !form.joiningDate) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const body = { ...form, dailyWage: Number(form.dailyWage) }
      const res = editWorker
        ? await api.put(`/api/workers/${editWorker._id}`, body)
        : await api.post('/api/workers', body)

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to save worker')
        return
      }
      toast.success(editWorker ? 'Worker updated!' : 'Worker added!')
      setShowModal(false)
      fetchWorkers()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/workers/${id}`)
      if (!res.ok) { toast.error('Failed to delete'); return }
      toast.success('Worker deleted')
      setDeleteId(null)
      fetchWorkers()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-40"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus size={16} /> Add Worker
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span><strong>{workers.filter(w => w.status === 'active').length}</strong> active</span>
        <span><strong>{workers.filter(w => w.status === 'inactive').length}</strong> inactive</span>
        <span><strong>{workers.length}</strong> total</span>
      </div>

      {/* Workers list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="card text-center py-12">
          <UserCheck size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No workers found</p>
          <button onClick={openAdd} className="btn-primary mt-4">Add First Worker</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Daily Wage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joining Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map(worker => (
                  <tr key={worker._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{worker.name}</td>
                    <td className="px-4 py-3 text-gray-600">{worker.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(worker.dailyWage)}/day</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(worker.joiningDate)}</td>
                    <td className="px-4 py-3">
                      <span className={worker.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(worker)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteId(worker._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {workers.map(worker => (
              <div key={worker._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{worker.name}</p>
                      <span className={worker.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                        {worker.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <Phone size={12} /> {worker.phone}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                      <IndianRupee size={12} /> {formatCurrency(worker.dailyWage)}/day
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Joined {formatDate(worker.joiningDate)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(worker)} className="p-2 text-blue-600 bg-blue-50 rounded-lg">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteId(worker._id)} className="p-2 text-red-600 bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editWorker ? 'Edit Worker' : 'Add New Worker'}</h2>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" type="tel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Wage (₹) *</label>
                <input className="input" value={form.dailyWage} onChange={e => setForm(f => ({ ...f, dailyWage: e.target.value }))} placeholder="e.g. 600" type="number" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                <input className="input" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} type="date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input h-20 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editWorker ? 'Update' : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete Worker</p>
                <p className="text-sm text-gray-500">This will also delete attendance & expense records</p>
              </div>
            </div>
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
