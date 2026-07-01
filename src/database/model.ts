import mongoose, { type SchemaDefinition } from 'mongoose'
import { store as dbStore } from './store'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

const mongooseModels = new Map<string, any>()
const mockModels = new Map<string, any>()

export interface ModelInterface {
  find(filter?: Record<string, unknown>): any
  findOne(filter?: Record<string, unknown>): Promise<Doc>
  findById(id: string): Promise<Doc>
  create(data: Record<string, unknown>): Promise<Doc>
  countDocuments(filter?: Record<string, unknown>): Promise<number>
  findByIdAndUpdate(id: string, update: Record<string, unknown>): Promise<Doc>
  findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<Doc>
  findByIdAndDelete(id: string): Promise<Doc>
  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount: number }>
  deleteMany(filter?: Record<string, unknown>): Promise<{ deletedCount: number }>
}

function getBackend(): 'mock' | 'mongo' {
  if (dbStore.useMock) return 'mock'
  if (mongoose.connection.readyState === 1) return 'mongo'
  if (process.env.USE_MONGO === 'false') return 'mock'
  const { NODE_ENV } = process.env
  if (NODE_ENV === 'production') {
    throw new Error('MongoDB is not connected. Cannot operate in production without a database.')
  }
  // Dev/test: fall back to mock to prevent mongoose buffering timeouts
  return 'mock'
}

function ensureMongoModel(name: string, schemaDef: SchemaDefinition): any {
  if (mongooseModels.has(name)) {
    return mongooseModels.get(name)
  }
  const schema = new mongoose.Schema(schemaDef, { timestamps: true })
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc: Record<string, unknown>, ret: Record<string, unknown>) {
      ret.id = (ret._id as string).toString()
      delete ret._id
      delete ret.__v
      return ret
    },
  })
  const model = mongoose.model(name, schema)
  mongooseModels.set(name, model)
  return model
}

function ensureMockModel(name: string): any {
  if (mockModels.has(name)) {
    return mockModels.get(name)
  }
  const { createMockModel } = require('./mockdb')
  const mock = createMockModel(name)
  mockModels.set(name, mock)
  return mock
}

const READ_METHODS = new Set(['find', 'findOne', 'findById'])

export function createModel(name: string, schemaDef: SchemaDefinition): ModelInterface {
  const handler: ProxyHandler<ModelInterface> = {
    get(_target, prop: string | symbol) {
      const backend = getBackend()
      const actualModel = backend === 'mock' ? ensureMockModel(name) : ensureMongoModel(name, schemaDef)

      const value = actualModel[prop]
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          const result = value.apply(actualModel, args)
          if (typeof prop === 'string' && READ_METHODS.has(prop)) {
            return result.lean ? result.lean() : result
          }
          return result
        }
      }
      return value
    },
  }

  return new Proxy({} as ModelInterface, handler)
}

export async function clearAllData(): Promise<void> {
  if (dbStore.useMock || mongoose.connection.readyState !== 1) {
    const { clearAllMockData } = require('./mockdb')
    await clearAllMockData()
    return
  }
  const promises: Promise<unknown>[] = []
  for (const model of mongooseModels.values()) {
    promises.push(model.deleteMany({}))
  }
  await Promise.all(promises)
}
