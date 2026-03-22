import mongoose, { Document, Schema } from 'mongoose'

export interface IAttendance extends Document {
  worker: mongoose.Types.ObjectId
  date: Date
  status: 'present' | 'absent' | 'half-day' | 'ot'
  otHours?: number   // extra hours worked (for OT)
  notes?: string
  createdAt: Date
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    worker: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'half-day', 'ot'], required: true },
    otHours: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

// Unique attendance per worker per day
AttendanceSchema.index({ worker: 1, date: 1 }, { unique: true })
AttendanceSchema.index({ date: 1 })
AttendanceSchema.index({ worker: 1 })

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema)
