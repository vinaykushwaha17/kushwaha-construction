import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  // Week starts on Monday
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return { start, end }
}

export function getWeekDays(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end })
}

export function normalizeDate(date: Date): Date {
  // Normalize to midnight UTC to avoid timezone issues
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Generate CSV from array of objects
export function generateCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',')
  const rows = data.map(row =>
    headers.map(header => {
      const val = row[header]
      // Escape commas and quotes
      const str = val !== null && val !== undefined ? String(val) : ''
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')
  )
  return [headerRow, ...rows].join('\n')
}
