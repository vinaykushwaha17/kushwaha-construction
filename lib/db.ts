import mongoose from 'mongoose'

interface GlobalMongoose {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Use a global variable to preserve the connection across hot reloads in dev
const globalWithMongoose = global as typeof globalThis & { mongoose: GlobalMongoose }

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null }
}

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  if (globalWithMongoose.mongoose.conn) {
    return globalWithMongoose.mongoose.conn
  }

  if (!globalWithMongoose.mongoose.promise) {
    const opts = {
      bufferCommands: false,
    }
    globalWithMongoose.mongoose.promise = mongoose.connect(MONGODB_URI, opts)
  }

  try {
    globalWithMongoose.mongoose.conn = await globalWithMongoose.mongoose.promise
  } catch (e) {
    globalWithMongoose.mongoose.promise = null
    throw e
  }

  return globalWithMongoose.mongoose.conn
}
