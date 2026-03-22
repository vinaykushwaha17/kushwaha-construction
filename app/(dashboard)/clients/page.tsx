'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp,
  Phone, Building2, Calendar, IndianRupee, CheckCircle2,
  Clock, AlertCircle, X, Banknote
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateInput, cn } from '@/lib/utils'

interface Client {
  _id: string
  name: string
  phone: string
  email?: string
  address?: string
  projectName: string
  projectDescription?: string
  startDate: string
  expectedEndDate: string
  actualEndDate?: string
  totalDealAmount: number
  status: 'ongoing' | 'completed' | 'cancelled' | 'on-hold'
  notes?: string
  createdAt: string
}

interface ClientPayment {
  _id: string
  amount: number
  date: string
  type: 'advance' | 'installment' | 'final' | 'other'
  mode: 'cash' | 'bank-transfer' | 'cheque' | 'upi'
  reference?: string
  notes?: string
}

const STATUS_COLORS: Record<string, string> = {
  ongoing:   'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
}

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '',
  projectName: '', projectDescription: '',
  startDate: formatDateInput(new Date()),
  expectedEndDate: '',
  totalDealAmount: '',
  status: 'ongoing' as Client['status'],
  notes: '',
}

const EMPTY_PAYMENT = {
  amount: '', date: formatDateInput(new Date()),
  type: 'installment' as ClientPayment['type'],
  mode: 'cash' as ClientPayment['mode'],
  reference: '', notes: '',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [payments, setPayments] = useState<Record<string, { list: ClientPayment[]; total: number }>>({})
  const [showClientModal, setShowClientModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null) // clientId
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [payForm, setPayForm] = useState({ ...EMPTY_PAYMENT })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data.clients || [])
    } catch {
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchClients, 300)
    return () => clearTimeout(t)
  }, [fetchClients])

  const fetchPayments = async (clientId: string) => {
    try {
      const res = await api.get(`/api/clients/${clientId}/payments`)
      const data = await res.json()
      setPayments(p => ({ ...p, [clientId]: { list: data.payments || [], total: data.total || 0 } }))
    } catch {
      toast.error('Failed to load payments')
    }
  }

  const toggleExpand = (clientId: string) => {
    if (expanded === clientId) {
      setExpanded(null)
    } else {
      setExpanded(clientId)
      if (!payments[clientId]) fetchPayments(clientId)
    }
  }

  const openAdd = () => {
    setEditClient(null)
    setForm({ ...EMPTY_FORM })
    setShowClientModal(true)
  }

  const openEdit = (c: Client) => {
    setEditClient(c)
    setForm({
      name: c.name, phone: c.phone, email: c.email || '', address: c.address || '',
      projectName: c.projectName, projectDescription: c.projectDescription || '',
      startDate: formatDateInput(new Date(c.startDate)),
      expectedEndDate: formatDateInput(new Date(c.expectedEndDate)),
      totalDealAmount: String(c.totalDealAmount),
      status: c.status,
      notes: c.notes || '',
    })
    setShowClientModal(true)
  }

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.projectName || !form.startDate || !form.expectedEndDate || !form.totalDealAmount) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const body = { ...form, totalDealAmount: Number(form.totalDealAmount) }
      const res = editClient
        ? await api.put(`/api/clients/${editClient._id}`, body)
        : await api.post('/api/clients', body)

      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Failed'); return }
      toast.success(editClient ? 'Client updated!' : 'Client added!')
      setShowClientModal(false)
      fetchClients()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/clients/${id}`)
      toast.success('Client deleted')
      setDeleteId(null)
      fetchClients()
    } catch {
      toast.error('Network error')
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showPaymentModal || !payForm.amount) { toast.error('Amount is required'); return }
    setSaving(true)
    try {
      const res = await api.post(`/api/clients/${showPaymentModal}/payments`, payForm)
      if (!res.ok) { toast.error('Failed to save'); return }
      toast.success('Payment recorded!')
      setShowPaymentModal(null)
      setPayForm({ ...EMPTY_PAYMENT })
      fetchPayments(showPaymentModal)
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async (clientId: string, paymentId: string) => {
    if (!confirm('Delete this payment?')) return
    try {
      await api.delete(`/api/clients/${clientId}/payments?paymentId=${paymentId}`)
      toast.success('Deleted')
      fetchPayments(clientId)
    } catch {
      toast.error('Network error')
    }
  }

  const totalOngoing = clients.filter(c => c.status === 'ongoing').length
  const totalDeal = clients.reduce((s, c) => s + c.totalDealAmount, 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or project..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-full sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-500">Total Projects</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{clients.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Ongoing</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalOngoing}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Total Deal Value</p>
          <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(totalDeal)}</p>
        </div>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-24" />)}</div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No clients found</p>
          <button onClick={openAdd} className="btn-primary mt-4">Add First Client</button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const clientPayments = payments[client._id]
            const totalReceived = clientPayments?.total || 0
            const balance = client.totalDealAmount - totalReceived
            const pct = client.totalDealAmount > 0 ? Math.min(100, (totalReceived / client.totalDealAmount) * 100) : 0
            const isExpanded = expanded === client._id
            const isOverdue = client.status === 'ongoing' && new Date(client.expectedEndDate) < new Date()

            return (
              <div key={client._id} className="card">
                {/* Header row */}
                <div
                  className="flex items-start justify-between cursor-pointer gap-3"
                  onClick={() => toggleExpand(client._id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{client.name}</p>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[client.status])}>
                        {client.status}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertCircle size={12} /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-blue-700 mt-0.5">{client.projectName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Phone size={11} /> {client.phone}</span>
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(client.startDate)} → {formatDate(client.expectedEndDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(client.totalDealAmount)}</p>
                      <p className="text-xs text-green-600">+{formatCurrency(totalReceived)} recd</p>
                      {balance > 0 && <p className="text-xs text-orange-600">-{formatCurrency(balance)} due</p>}
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% received</p>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => { setShowPaymentModal(client._id); setPayForm({ ...EMPTY_PAYMENT }) }} className="btn-success flex items-center gap-2 text-sm py-2 px-3">
                        <Banknote size={14} /> Add Payment
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(client) }} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
                        <Edit2 size={14} /> Edit Client
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(client._id) }} className="btn-danger flex items-center gap-2 text-sm py-2 px-3">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Deal Amount:</span> <strong>{formatCurrency(client.totalDealAmount)}</strong></div>
                      <div><span className="text-gray-500">Total Received:</span> <strong className="text-green-700">{formatCurrency(totalReceived)}</strong></div>
                      <div><span className="text-gray-500">Balance Due:</span> <strong className={balance > 0 ? 'text-orange-600' : 'text-green-600'}>{formatCurrency(balance)}</strong></div>
                      <div><span className="text-gray-500">Status:</span> <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[client.status])}>{client.status}</span></div>
                      {client.address && <div className="col-span-2"><span className="text-gray-500">Address:</span> {client.address}</div>}
                      {client.projectDescription && <div className="col-span-2"><span className="text-gray-500">Description:</span> {client.projectDescription}</div>}
                      {client.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {client.notes}</div>}
                    </div>

                    {/* Payment history */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Payment History</p>
                      {!clientPayments ? (
                        <div className="h-10 bg-gray-100 animate-pulse rounded" />
                      ) : clientPayments.list.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No payments recorded yet</p>
                      ) : (
                        <div className="space-y-2">
                          {clientPayments.list.map(pay => (
                            <div key={pay._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">{formatCurrency(pay.amount)}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{pay.type}</span>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{pay.mode}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatDate(pay.date)}
                                  {pay.reference && ` · Ref: ${pay.reference}`}
                                  {pay.notes && ` · ${pay.notes}`}
                                </p>
                              </div>
                              <button onClick={() => handleDeletePayment(client._id, pay._id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">{editClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={() => setShowClientModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" type="tel" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" type="email" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address (optional)" />
                </div>
              </div>

              <hr className="border-gray-100" />
              <p className="text-sm font-semibold text-gray-700">Project Details</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input className="input" value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="e.g. 3BHK Villa Construction" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input h-16 resize-none" value={form.projectDescription} onChange={e => setForm(f => ({ ...f, projectDescription: e.target.value }))} placeholder="Project description (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected End *</label>
                  <input type="date" className="input" value={form.expectedEndDate} onChange={e => setForm(f => ({ ...f, expectedEndDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Deal (₹) *</label>
                  <input type="number" className="input" min="0" value={form.totalDealAmount} onChange={e => setForm(f => ({ ...f, totalDealAmount: e.target.value }))} placeholder="e.g. 5000000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Client['status'] }))}>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input h-16 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowClientModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editClient ? 'Update' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">Record Client Payment</h2>
              <button onClick={() => setShowPaymentModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" className="input" min="1" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 100000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" className="input" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="input" value={payForm.type} onChange={e => setPayForm(f => ({ ...f, type: e.target.value as ClientPayment['type'] }))}>
                    <option value="advance">Advance</option>
                    <option value="installment">Installment</option>
                    <option value="final">Final Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select className="input" value={payForm.mode} onChange={e => setPayForm(f => ({ ...f, mode: e.target.value as ClientPayment['mode'] }))}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                  <input className="input" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Txn ID / Cheque No." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPaymentModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-success flex-1 flex items-center justify-center gap-2">
                  <Banknote size={15} /> {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <p className="font-semibold text-gray-900 mb-1">Delete this client?</p>
            <p className="text-sm text-gray-500 mb-4">All payment records for this client will also be deleted.</p>
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
