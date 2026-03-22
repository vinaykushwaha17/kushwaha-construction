'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Save, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatDate, formatDateInput, cn } from '@/lib/utils'

interface Worker {
  _id: string
  name: string
  phone: string
  dailyWage: number
}

interface AttendanceRow {
  worker: Worker
  attendance: { status: string; notes?: string } | null
}

type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'ot' | ''

interface LocalAttendance {
  [workerId: string]: AttendanceStatus
}

const STATUS_CONFIG = [
  { key: 'present' as const,   label: 'P',  fullLabel: 'Present',   activeClass: 'bg-green-600 text-white border-green-600',  infoClass: 'bg-green-50 text-green-800',  icon: CheckCircle2 },
  { key: 'absent' as const,    label: 'A',  fullLabel: 'Absent',    activeClass: 'bg-red-600 text-white border-red-600',     infoClass: 'bg-red-50 text-red-800',     icon: XCircle },
  { key: 'half-day' as const,  label: 'H',  fullLabel: 'Half Day',  activeClass: 'bg-yellow-500 text-white border-yellow-500', infoClass: 'bg-yellow-50 text-yellow-800', icon: Clock },
  { key: 'ot' as const,        label: 'OT', fullLabel: 'Over Time', activeClass: 'bg-purple-600 text-white border-purple-600', infoClass: 'bg-purple-50 text-purple-800', icon: Zap },
]

export default function AttendancePage() {
  const [date, setDate] = useState(formatDateInput(new Date()))
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [local, setLocal] = useState<LocalAttendance>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'mark' | 'history'>('mark')
  const [history, setHistory] = useState<AttendanceRow[]>([])
  const [histWorker, setHistWorker] = useState('')
  const [histStart, setHistStart] = useState(formatDateInput(new Date(Date.now() - 7 * 86400000)))
  const [histEnd, setHistEnd] = useState(formatDateInput(new Date()))
  const [workers, setWorkers] = useState<Worker[]>([])

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.put('/api/attendance', { date })
      const data = await res.json()
      setRows(data.result || [])
      const init: LocalAttendance = {}
      for (const row of (data.result || [])) {
        init[row.worker._id] = (row.attendance?.status as AttendanceStatus) || ''
      }
      setLocal(init)
    } catch {
      toast.error('Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    if (tab === 'mark') fetchAttendance()
  }, [date, tab, fetchAttendance])

  useEffect(() => {
    api.get('/api/workers?status=active&limit=200').then(r => r.json()).then(d => setWorkers(d.workers || []))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(local)
        .filter(([, status]) => status !== '')
        .map(([workerId, status]) => ({ workerId, date, status }))

      if (payload.length === 0) {
        toast.error('No attendance marked')
        setSaving(false)
        return
      }

      const res = await api.post('/api/attendance', payload)
      if (!res.ok) { toast.error('Failed to save'); return }
      toast.success(`Attendance saved for ${payload.length} workers`)
      fetchAttendance()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const markAll = (status: AttendanceStatus) => {
    const updated: LocalAttendance = {}
    rows.forEach(r => { updated[r.worker._id] = status })
    setLocal(updated)
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ startDate: histStart, endDate: histEnd })
      if (histWorker) params.set('workerId', histWorker)
      const res = await api.get(`/api/attendance?${params}`)
      const data = await res.json()
      setHistory(data.attendance || [])
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const prevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(formatDateInput(d))
  }

  const nextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    if (d <= new Date()) setDate(formatDateInput(d))
  }

  const counts = STATUS_CONFIG.map(s => ({
    ...s,
    count: Object.values(local).filter(v => v === s.key).length,
  }))

  const getBadgeClass = (status: string) => {
    if (status === 'present') return 'badge-present'
    if (status === 'absent') return 'badge-absent'
    if (status === 'half-day') return 'badge-halfday'
    if (status === 'ot') return 'bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full'
    return ''
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('mark')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'mark' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => { setTab('history'); fetchHistory() }}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'history' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}
        >
          History
        </button>
      </div>

      {tab === 'mark' && (
        <>
          {/* Date Selector */}
          <div className="card flex items-center justify-between">
            <button onClick={prevDay} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-900">{formatDate(date)}</p>
              <p className="text-xs text-gray-500">{date === formatDateInput(new Date()) ? 'Today' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input w-36 text-sm"
                value={date}
                max={formatDateInput(new Date())}
                onChange={e => setDate(e.target.value)}
              />
              <button onClick={nextDay} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Summary Bar */}
          {rows.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {counts.map(s => s.count > 0 && (
                <div key={s.key} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${s.infoClass}`}>
                  <s.icon size={13} />
                  <span className="text-sm font-medium">{s.count} {s.fullLabel}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bulk actions */}
          {rows.length > 0 && (
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm text-gray-600">Mark all:</span>
              <button onClick={() => markAll('present')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                All Present
              </button>
              <button onClick={() => markAll('absent')} className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                All Absent
              </button>
              <button onClick={() => markAll('')} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Clear All
              </button>
            </div>
          )}

          {/* OT note */}
          <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
            <Zap size={13} />
            <span>OT (Over Time) = 1.5× daily wage in salary calculation</span>
          </div>

          {/* Attendance List */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card animate-pulse flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500">No active workers found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(({ worker }) => (
                <div key={worker._id} className="card flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{worker.name}</p>
                    <p className="text-xs text-gray-500">₹{worker.dailyWage}/day</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {STATUS_CONFIG.map(({ key, label, activeClass }) => (
                      <button
                        key={key}
                        onClick={() => setLocal(l => ({ ...l, [worker._id]: l[worker._id] === key ? '' : key }))}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all',
                          local[worker._id] === key
                            ? activeClass
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" className="input" value={histStart} onChange={e => setHistStart(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" className="input" value={histEnd} onChange={e => setHistEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Worker (optional)</label>
              <select className="input" value={histWorker} onChange={e => setHistWorker(e.target.value)}>
                <option value="">All Workers</option>
                {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <button onClick={fetchHistory} className="btn-primary w-full">View History</button>
          </div>

          {loading ? (
            <div className="card animate-pulse h-32" />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-container">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Worker</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history as unknown as Array<{_id: string; worker: Worker; date: string; status: string}>).map(record => (
                      <tr key={record._id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{record.worker?.name}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(record.date)}</td>
                        <td className="px-4 py-3">
                          <span className={getBadgeClass(record.status)}>{record.status}</span>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
