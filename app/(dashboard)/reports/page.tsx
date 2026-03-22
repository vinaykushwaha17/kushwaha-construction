'use client'

import { useState } from 'react'
import { Download, BarChart3, FileText, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateInput, generateCSV } from '@/lib/utils'

interface WorkerReport {
  worker: { _id: string; name: string; phone: string; dailyWage: number }
  presentDays: number
  halfDays: number
  absentDays: number
  totalAdvances: number
  totalPaid: number
  grossSalary: number
}

interface ExpenseReport {
  _id: string
  worker: { name: string }
  amount: number
  reason: string
  type: string
  date: string
}

interface WeeklyPayment {
  _id: string
  worker: { name: string }
  amount: number
  netSalary: number
  periodStart: string
  periodEnd: string
  presentDays: number
  status: string
  type: string
}

export default function ReportsPage() {
  const [type, setType] = useState<'worker' | 'expense' | 'weekly'>('worker')
  const [startDate, setStartDate] = useState(formatDateInput(new Date(Date.now() - 30 * 86400000)))
  const [endDate, setEndDate] = useState(formatDateInput(new Date()))
  const [data, setData] = useState<WorkerReport[] | ExpenseReport[] | WeeklyPayment[] | null>(null)
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, startDate, endDate })
      const res = await api.get(`/api/reports?${params}`)
      const result = await res.json()

      if (type === 'worker') {
        setData(result.report)
      } else if (type === 'expense') {
        setData(result.expenses)
        setSummary({ total: result.total })
      } else {
        setData(result.payments)
        setSummary({ totalPaid: result.totalPaid, totalPending: result.totalPending })
      }
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!data || data.length === 0) { toast.error('No data to export'); return }

    let csvData: Record<string, unknown>[] = []
    let headers: string[] = []

    if (type === 'worker') {
      const rows = data as WorkerReport[]
      headers = ['Name', 'Phone', 'Daily Wage', 'Present Days', 'Half Days', 'Absent Days', 'Gross Salary', 'Total Advances', 'Total Paid']
      csvData = rows.map(r => ({
        Name: r.worker.name,
        Phone: r.worker.phone,
        'Daily Wage': r.worker.dailyWage,
        'Present Days': r.presentDays,
        'Half Days': r.halfDays,
        'Absent Days': r.absentDays,
        'Gross Salary': r.grossSalary,
        'Total Advances': r.totalAdvances,
        'Total Paid': r.totalPaid,
      }))
    } else if (type === 'expense') {
      const rows = data as ExpenseReport[]
      headers = ['Worker', 'Amount', 'Reason', 'Type', 'Date']
      csvData = rows.map(r => ({
        Worker: r.worker?.name,
        Amount: r.amount,
        Reason: r.reason,
        Type: r.type,
        Date: formatDate(r.date),
      }))
    } else {
      const rows = data as WeeklyPayment[]
      headers = ['Worker', 'Period Start', 'Period End', 'Present Days', 'Net Salary', 'Status', 'Type']
      csvData = rows.map(r => ({
        Worker: r.worker?.name,
        'Period Start': formatDate(r.periodStart),
        'Period End': formatDate(r.periodEnd),
        'Present Days': r.presentDays,
        'Net Salary': r.netSalary,
        Status: r.status,
        Type: r.type,
      }))
    }

    const csv = generateCSV(csvData, headers)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-report-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card space-y-4">
        {/* Report type tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'worker', label: 'Worker Report', icon: BarChart3 },
            { key: 'expense', label: 'Expense Report', icon: TrendingDown },
            { key: 'weekly', label: 'Payment Report', icon: FileText },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setType(t.key); setData(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${type === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleGenerate} disabled={loading} className="btn-primary flex-1 py-2.5">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {data && data.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 px-4">
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {data && Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(summary).map(([key, val]) => (
            <div key={key} className="card">
              <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Worker Report */}
      {type === 'worker' && data && (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Worker</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Present</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Half</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Absent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Advances</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                </tr>
              </thead>
              <tbody>
                {(data as WorkerReport[]).map(row => (
                  <tr key={row.worker._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.worker.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(row.worker.dailyWage)}/day</p>
                    </td>
                    <td className="px-3 py-3 text-center text-green-700 font-medium">{row.presentDays}</td>
                    <td className="px-3 py-3 text-center text-yellow-700 font-medium">{row.halfDays}</td>
                    <td className="px-3 py-3 text-center text-red-700 font-medium">{row.absentDays}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.grossSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.totalAdvances)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold">{formatCurrency(row.totalPaid)}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Report */}
      {type === 'expense' && data && (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Worker</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {(data as ExpenseReport[]).map(row => (
                  <tr key={row._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.worker?.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.reason}</td>
                    <td className="px-4 py-3"><span className="badge-pending text-xs">{row.type}</span></td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.date)}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weekly Payment Report */}
      {type === 'weekly' && data && (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Worker</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Days</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data as WeeklyPayment[]).map(row => (
                  <tr key={row._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.worker?.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatDate(row.periodStart)}<br />to {formatDate(row.periodEnd)}
                    </td>
                    <td className="px-3 py-3 text-center">{row.presentDays}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.netSalary)}</td>
                    <td className="px-4 py-3">
                      <span className={row.status === 'paid' ? 'badge-paid' : 'badge-pending'}>{row.status}</span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
