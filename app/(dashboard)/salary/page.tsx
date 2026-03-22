'use client'

import { useState } from 'react'
import { Calculator, Save, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateInput, getWeekRange } from '@/lib/utils'

interface Worker { _id: string; name: string; phone: string; dailyWage: number }
interface SalaryRow {
  worker: Worker
  presentDays: number
  grossSalary: number
  totalAdvances: number
  netSalary: number
  manualOverride?: number
}

export default function SalaryPage() {
  const weekRange = getWeekRange(new Date(Date.now() - 7 * 86400000)) // last week
  const [startDate, setStartDate] = useState(formatDateInput(weekRange.start))
  const [endDate, setEndDate] = useState(formatDateInput(weekRange.end))
  const [salaries, setSalaries] = useState<SalaryRow[]>([])
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const setThisWeek = () => {
    const range = getWeekRange(new Date())
    setStartDate(formatDateInput(range.start))
    setEndDate(formatDateInput(range.end))
  }

  const setLastWeek = () => {
    const range = getWeekRange(new Date(Date.now() - 7 * 86400000))
    setStartDate(formatDateInput(range.start))
    setEndDate(formatDateInput(range.end))
  }

  const handleCalculate = async () => {
    if (!startDate || !endDate) { toast.error('Select date range'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/salary/calculate', { startDate, endDate })
      const data = await res.json()
      setSalaries(data.salaries || [])
      setOverrides({})
      if (data.salaries?.length === 0) toast('No active workers found', { icon: '⚠️' })
    } catch {
      toast.error('Failed to calculate')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePayments = async () => {
    if (salaries.length === 0) { toast.error('Calculate salaries first'); return }
    setSaving(true)
    try {
      const payments = salaries.map(row => ({
        workerId: row.worker._id,
        periodStart: startDate,
        periodEnd: endDate,
        presentDays: row.presentDays,
        dailyWage: row.worker.dailyWage,
        grossSalary: row.grossSalary,
        totalAdvances: row.totalAdvances,
        netSalary: row.netSalary,
        manualOverride: overrides[row.worker._id] ? Number(overrides[row.worker._id]) : undefined,
        type: 'weekly',
      }))

      // Create all payments
      await Promise.all(payments.map(p => api.post('/api/payments', p)))
      toast.success(`${payments.length} payment records created!`)
      setSalaries([])
    } catch {
      toast.error('Failed to save payments')
    } finally {
      setSaving(false)
    }
  }

  const totalGross = salaries.reduce((s, r) => s + r.grossSalary, 0)
  const totalAdvances = salaries.reduce((s, r) => s + r.totalAdvances, 0)
  const totalNet = salaries.reduce((s, r) => {
    const override = overrides[r.worker._id]
    return s + (override !== undefined ? Number(override) : r.netSalary)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="card space-y-3">
        <div className="flex gap-2">
          <button onClick={setLastWeek} className="btn-secondary text-sm">Last Week</button>
          <button onClick={setThisWeek} className="btn-secondary text-sm">This Week</button>
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
        <button onClick={handleCalculate} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <Calculator size={16} />
          {loading ? 'Calculating...' : 'Calculate Salaries'}
        </button>
      </div>

      {/* Summary */}
      {salaries.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <p className="text-xs text-gray-500">Gross Total</p>
              <p className="font-bold text-gray-900 mt-1">{formatCurrency(totalGross)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Total Advances</p>
              <p className="font-bold text-red-600 mt-1">-{formatCurrency(totalAdvances)}</p>
            </div>
            <div className="card text-center bg-blue-50 border-blue-100">
              <p className="text-xs text-blue-600">Net Payable</p>
              <p className="font-bold text-blue-900 mt-1">{formatCurrency(totalNet)}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 font-medium">
            Period: {formatDate(startDate)} — {formatDate(endDate)}
          </p>

          {/* Salary rows */}
          <div className="space-y-3">
            {salaries.map(row => {
              const finalAmount = overrides[row.worker._id] !== undefined
                ? Number(overrides[row.worker._id])
                : row.netSalary
              const isExpanded = expanded === row.worker._id

              return (
                <div key={row.worker._id} className="card">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : row.worker._id)}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{row.worker.name}</p>
                      <p className="text-xs text-gray-500">
                        {row.presentDays} days × {formatCurrency(row.worker.dailyWage)} = {formatCurrency(row.grossSalary)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatCurrency(finalAmount)}</p>
                        {row.totalAdvances > 0 && (
                          <p className="text-xs text-red-500">-{formatCurrency(row.totalAdvances)} adv</p>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Present Days:</span> <strong>{row.presentDays}</strong></div>
                        <div><span className="text-gray-500">Daily Wage:</span> <strong>{formatCurrency(row.worker.dailyWage)}</strong></div>
                        <div><span className="text-gray-500">Gross Salary:</span> <strong>{formatCurrency(row.grossSalary)}</strong></div>
                        <div><span className="text-gray-500">Advances:</span> <strong className="text-red-600">-{formatCurrency(row.totalAdvances)}</strong></div>
                        <div><span className="text-gray-500">Net Salary:</span> <strong className="text-blue-700">{formatCurrency(row.netSalary)}</strong></div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Manual Override Amount</label>
                        <div className="flex items-center gap-2">
                          <IndianRupee size={14} className="text-gray-400" />
                          <input
                            type="number"
                            className="input flex-1"
                            placeholder={String(row.netSalary)}
                            value={overrides[row.worker._id] || ''}
                            onChange={e => setOverrides(o => ({ ...o, [row.worker._id]: e.target.value }))}
                          />
                          {overrides[row.worker._id] && (
                            <button onClick={() => setOverrides(o => { const n = { ...o }; delete n[row.worker._id]; return n })} className="text-xs text-gray-400 hover:text-red-500">
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={handleSavePayments}
            disabled={saving}
            className="btn-success w-full flex items-center justify-center gap-2 py-3"
          >
            <Save size={16} />
            {saving ? 'Saving...' : `Create ${salaries.length} Payment Records`}
          </button>
        </>
      )}
    </div>
  )
}
