import mongoose, { Document, Schema } from 'mongoose'

export interface IExpense extends Document {
  worker: mongoose.Types.ObjectId
  amount: number
  reason: string
  date: Date
  type: 'advance' | 'deduction' | 'bonus'
  notes?: string
  createdAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
  {
    worker: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['advance', 'deduction', 'bonus'], default: 'advance' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

ExpenseSchema.index({ worker: 1, date: -1 })
ExpenseSchema.index({ date: -1 })

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)
