import mongoose, { Document, Schema } from 'mongoose'

export interface IClient extends Document {
  name: string
  phone: string
  email?: string
  address?: string
  projectName: string
  projectDescription?: string
  startDate: Date
  expectedEndDate: Date
  actualEndDate?: Date
  totalDealAmount: number
  status: 'ongoing' | 'completed' | 'cancelled' | 'on-hold'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    projectName: { type: String, required: true, trim: true },
    projectDescription: { type: String, trim: true },
    startDate: { type: Date, required: true },
    expectedEndDate: { type: Date, required: true },
    actualEndDate: { type: Date },
    totalDealAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'cancelled', 'on-hold'],
      default: 'ongoing',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

ClientSchema.index({ name: 'text', projectName: 'text' })
ClientSchema.index({ status: 1 })

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema)
