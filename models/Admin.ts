import mongoose, { Document, Schema } from 'mongoose'

export interface IAdmin extends Document {
  username: string
  password: string
  name: string
  createdAt: Date
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema)
