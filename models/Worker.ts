import mongoose, { Document, Schema } from 'mongoose'

export interface IWorker extends Document {
  name: string
  phone: string
  dailyWage: number
  joiningDate: Date
  status: 'active' | 'inactive'
  address?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const WorkerSchema = new Schema<IWorker>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    dailyWage: { type: Number, required: true, min: 0 },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

// Index for faster search
WorkerSchema.index({ name: 'text', phone: 'text' })
WorkerSchema.index({ status: 1 })

export default mongoose.models.Worker || mongoose.model<IWorker>('Worker', WorkerSchema)
