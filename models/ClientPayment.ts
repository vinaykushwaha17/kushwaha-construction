import mongoose, { Document, Schema } from 'mongoose'

export interface IClientPayment extends Document {
  client: mongoose.Types.ObjectId
  amount: number
  date: Date
  type: 'advance' | 'installment' | 'final' | 'other'
  mode: 'cash' | 'bank-transfer' | 'cheque' | 'upi'
  reference?: string   // cheque number / transaction ID
  notes?: string
  createdAt: Date
}

const ClientPaymentSchema = new Schema<IClientPayment>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['advance', 'installment', 'final', 'other'],
      default: 'installment',
    },
    mode: {
      type: String,
      enum: ['cash', 'bank-transfer', 'cheque', 'upi'],
      default: 'cash',
    },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

ClientPaymentSchema.index({ client: 1, date: -1 })

export default mongoose.models.ClientPayment ||
  mongoose.model<IClientPayment>('ClientPayment', ClientPaymentSchema)
