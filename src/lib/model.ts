import mongoose, { type SchemaDefinition, type Model, type Document } from 'mongoose'
import { config } from '../config'

let idCounter = 1
function newId(): string {
  return String(idCounter++)
}

type DocData = Record<string, unknown>

interface Filter {
  [key: string]: unknown
  $or?: Filter[]
  $and?: Filter[]
}

interface WrappedDoc extends DocData {
  toJSON(): Record<string, unknown>
  save(): void
  populate(): Promise<WrappedDoc>
}

class MemCollection {
  private _data: DocData[] = []

  private _match(doc: DocData, filter: Filter): boolean {
    for (const key of Object.keys(filter)) {
      if (key === '$or') {
        if (!filter.$or!.some((cond) => this._match(doc, cond))) return false
        continue
      }
      if (key === '$and') {
        if (!filter.$and!.every((cond) => this._match(doc, cond))) return false
        continue
      }
      const val = filter[key]
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const cond = val as Record<string, unknown>
        if (cond.$gte !== undefined || cond.$lte !== undefined) {
          const d = Number(doc[key])
          if (cond.$gte !== undefined && d < (cond.$gte as number)) return false
          if (cond.$lte !== undefined && d > (cond.$lte as number)) return false
          continue
        }
        if (cond.$regex) {
          const re = new RegExp(cond.$regex as string, (cond.$options as string) || 'i')
          if (!re.test(String(doc[key] || ''))) return false
          continue
        }
        if (cond.$ne !== undefined && String(doc[key]) === String(cond.$ne)) return false
        if (cond.$in && !(cond.$in as unknown[]).includes(doc[key])) return false
        continue
      }
      if (String(doc[key] ?? '') !== String(val)) return false
    }
    return true
  }

  private _wrap(data: DocData): WrappedDoc {
    const self = this
    const doc = { ...data }
    return {
      ...doc,
      toJSON(): Record<string, unknown> {
        const ret: Record<string, unknown> = {}
        const keys = new Set([...Object.keys(doc), ...Object.keys(this as Record<string, unknown>)])
        for (const k of keys) {
          if (k === 'toJSON' || k === 'save' || k === 'populate') continue
          const val = (this as Record<string, unknown>)[k]
          if (val !== undefined) ret[k] = val
        }
        ret.id = String(doc._id)
        delete ret._id
        delete ret.__v
        return ret
      },
      save(): void {
        const idx = self._data.findIndex((d) => String(d._id) === String(doc._id))
        if (idx !== -1) {
          self._data[idx] = { ...self._data[idx], ...doc, updatedAt: new Date().toISOString() }
        }
      },
      populate(): Promise<WrappedDoc> {
        return Promise.resolve(this)
      },
    }
  }

  find(filter: Filter = {}) {
    const results = this._data.filter((d) => this._match(d, filter))
    return new Query(results, (arr: DocData[]) => arr.map((d) => this._wrap(d)))
  }

  findOne(filter: Filter = {}) {
    const d = this._data.find((e) => this._match(e, filter))
    return Promise.resolve(d ? this._wrap(d) : null)
  }

  findById(id: string) {
    const d = this._data.find((e) => String(e._id) === String(id))
    return Promise.resolve(d ? this._wrap(d) : null)
  }

  create(data: DocData) {
    const doc: DocData = {
      _id: newId(),
      ...data,
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this._data.push(doc)
    return Promise.resolve(this._wrap(doc))
  }

  countDocuments(filter: Filter = {}) {
    return Promise.resolve(this._data.filter((d) => this._match(d, filter)).length)
  }

  findOneAndUpdate(filter: Filter, update: DocData) {
    const idx = this._data.findIndex((d) => this._match(d, filter))
    if (idx === -1) return Promise.resolve(null)
    if (update.$set) Object.assign(this._data[idx], update.$set as DocData)
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
        this._data[idx][k] = ((this._data[idx][k] as number) || 0) + v
      }
    }
    this._data[idx].updatedAt = new Date().toISOString()
    return Promise.resolve(this._wrap(this._data[idx]))
  }

  findByIdAndDelete(id: string) {
    const idx = this._data.findIndex((d) => String(d._id) === String(id))
    if (idx === -1) return Promise.resolve(null)
    const deleted = this._data.splice(idx, 1)[0]
    return Promise.resolve(this._wrap(deleted))
  }

  clear(): void {
    this._data = []
  }
}

class Query {
  private _data: DocData[]
  private _wrapFn: (arr: DocData[]) => WrappedDoc[]
  private _sortObj: Record<string, number> | null = null
  private _skipVal = 0
  private _limitVal: number | null = null

  constructor(data: DocData[], wrapFn: (arr: DocData[]) => WrappedDoc[]) {
    this._data = Array.isArray(data) ? data : []
    this._wrapFn = wrapFn
  }

  private _clone(): Query {
    const q = new Query(this._data, this._wrapFn)
    q._sortObj = this._sortObj
    q._skipVal = this._skipVal
    q._limitVal = this._limitVal
    return q
  }

  sort(obj: Record<string, number>): Query {
    const q = this._clone()
    q._sortObj = obj
    return q
  }

  skip(n: number): Query {
    const q = this._clone()
    q._skipVal = n || 0
    return q
  }

  limit(n: number): Query {
    const q = this._clone()
    q._limitVal = n || null
    return q
  }

  populate(): this {
    return this
  }

  then<TResult1 = WrappedDoc[], TResult2 = never>(
    resolve?: ((value: WrappedDoc[]) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      let arr = [...this._data]

      if (this._sortObj) {
        const key = Object.keys(this._sortObj)[0]
        const dir = this._sortObj[key] === -1 ? -1 : 1
        arr.sort((a, b) => {
          const va = a[key] as string | number
          const vb = b[key] as string | number
          if (dir === -1) return new Date(vb).getTime() - new Date(va).getTime()
          return new Date(va).getTime() - new Date(vb).getTime()
        })
      }

      if (this._skipVal > 0) arr = arr.slice(this._skipVal)
      if (this._limitVal != null) arr = arr.slice(0, this._limitVal)

      return Promise.resolve(this._wrapFn(arr)).then(resolve, reject)
    } catch (e) {
      return Promise.reject(e).then(resolve, reject)
    }
  }

  catch<TResult = never>(
    reject?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<WrappedDoc[] | TResult> {
    return this.then(null, reject)
  }

  finally(onFinally?: (() => void) | null): Promise<WrappedDoc[]> {
    return this.then(
      (value) => {
        onFinally?.()
        return value
      },
      (reason) => {
        onFinally?.()
        throw reason
      },
    )
  }

  [Symbol.toStringTag](): string {
    return 'Query'
  }
}

const memCollections = new Map<string, MemCollection>()
const schemas = new Map<string, SchemaDefinition>()
const mongooseModels = new Map<string, Model<Document>>()

function getMemCollection(name: string): MemCollection {
  if (!memCollections.has(name)) memCollections.set(name, new MemCollection())
  return memCollections.get(name)!
}

export interface ModelInterface {
  find(filter?: Filter): Query
  findOne(filter?: Filter): Promise<WrappedDoc | null>
  findById(id: string): Promise<WrappedDoc | null>
  create(data: DocData): Promise<WrappedDoc>
  countDocuments(filter?: Filter): Promise<number>
  findByIdAndUpdate(id: string, update: DocData): Promise<WrappedDoc | null>
  findOneAndUpdate(filter: Filter, update: DocData): Promise<WrappedDoc | null>
  findByIdAndDelete(id: string): Promise<WrappedDoc | null>
}

export function usingMemory(): boolean {
  return !config.mongodb.useMongo || (typeof mongoose.connection !== 'undefined' && mongoose.connection.readyState !== 1)
}

function defineMongooseModel(name: string, schemaDef: SchemaDefinition): void {
  if (mongooseModels.has(name)) return

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

  mongooseModels.set(name, mongoose.model(name, schema) as any)
}

function resolveModel(name: string): { useMongo: boolean; col: MemCollection; mongooseModel: any } | null {
  if (!usingMemory() && mongoose.connection.readyState === 1) {
    const schemaDef = schemas.get(name)
    if (schemaDef) {
      defineMongooseModel(name, schemaDef)
      return {
        useMongo: true,
        col: getMemCollection(name),
        mongooseModel: mongooseModels.get(name) as any,
      }
    }
  }
  return null
}

function useMongoNow(name: string): boolean {
  return !usingMemory() && mongoose.connection.readyState === 1 && schemas.has(name)
}

function getOrDefineMongo(name: string): any {
  if (!mongooseModels.has(name)) {
    const schemaDef = schemas.get(name)
    if (schemaDef) defineMongooseModel(name, schemaDef)
  }
  return mongooseModels.get(name) as any
}

export function createModel(name: string, schemaDef: SchemaDefinition): ModelInterface {
  schemas.set(name, schemaDef)

  const col = getMemCollection(name)

  return {
    find(filter = {}) {
      if (useMongoNow(name)) return getOrDefineMongo(name).find(filter)
      return col.find(filter)
    },
    findOne(filter = {}) {
      if (useMongoNow(name)) return getOrDefineMongo(name).findOne(filter)
      return col.findOne(filter)
    },
    findById(id: string) {
      if (useMongoNow(name)) return getOrDefineMongo(name).findById(id)
      return col.findById(id)
    },
    create(data: DocData) {
      if (useMongoNow(name)) return getOrDefineMongo(name).create(data)
      return col.create(data)
    },
    countDocuments(filter = {}) {
      if (useMongoNow(name)) return getOrDefineMongo(name).countDocuments(filter)
      return col.countDocuments(filter)
    },
    findByIdAndUpdate(id: string, update: DocData) {
      if (useMongoNow(name)) return getOrDefineMongo(name).findByIdAndUpdate(id, update, { new: true })
      return col.findOneAndUpdate({ _id: id }, update)
    },
    findOneAndUpdate(filter: Filter, update: DocData) {
      if (useMongoNow(name)) return getOrDefineMongo(name).findOneAndUpdate(filter, update, { new: true })
      return col.findOneAndUpdate(filter, update)
    },
    findByIdAndDelete(id: string) {
      if (useMongoNow(name)) return getOrDefineMongo(name).findByIdAndDelete(id)
      return col.findByIdAndDelete(id)
    },
  }
}

export async function clearAllData(): Promise<void> {
  for (const col of memCollections.values()) {
    col.clear()
  }
  if (!usingMemory()) {
    const promises: Promise<unknown>[] = []
    for (const model of mongooseModels.values()) {
      promises.push(model.deleteMany({}))
    }
    await Promise.all(promises)
  }
}
