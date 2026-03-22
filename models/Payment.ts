import mongoose, { Document, Schema } from 'mongoose'

export interface IPayment extends Document {
  worker: mongoose.Types.ObjectId
  amount: number
  periodStart: Date
  periodEnd: Date
  presentDays: number
  dailyWage: number
  grossSalary: number
  totalAdvances: number
  netSalary: number
  manualOverride?: number
  type: 'weekly' | 'festival' | 'special' | 'advance'
  status: 'paid' | 'pending'
  paidAt?: Date
  notes?: string
  createdAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    worker: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
    amount: { type: Number, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    presentDays: { type: Number, required: true, default: 0 },
    dailyWage: { type: Number, required: true },
    grossSalary: { type: Number, required: true },
    totalAdvances: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    manualOverride: { type: Number },
    type: { type: String, enum: ['weekly', 'festival', 'special', 'advance'], default: 'weekly' },
    status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
    paidAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

PaymentSchema.index({ worker: 1, createdAt: -1 })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ periodStart: 1, periodEnd: 1 })

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
