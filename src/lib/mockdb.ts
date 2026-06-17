import * as fs from 'fs'
import * as path from 'path'

let nextId = 1

const PERSIST_FILE = path.resolve(__dirname, '../../data/mock-db.json')

function ensureDir(): void {
  const dir = path.dirname(PERSIST_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function addToJSON(doc: Record<string, unknown>): void {
  if (typeof doc.toJSON === 'function') return
  Object.defineProperty(doc, 'toJSON', {
    value() { return { ...this, id: this._id } },
    enumerable: false,
    configurable: true,
    writable: true,
  })
}

// Wrap each doc with toJSON after deserializing from JSON file
function hydrateDoc(doc: Record<string, unknown>): void {
  addToJSON(doc)
  // Restore Date objects for timestamps
  if (typeof doc.createdAt === 'string') doc.createdAt = doc.createdAt
  if (typeof doc.updatedAt === 'string') doc.updatedAt = doc.updatedAt
}

function loadCollections(): Map<string, Map<string, Record<string, unknown>>> {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf-8')
      const data = JSON.parse(raw)
      const result = new Map<string, Map<string, Record<string, unknown>>>()
      for (const [key, entries] of Object.entries(data)) {
        const m = new Map(Object.entries(entries as Record<string, Record<string, unknown>>))
        for (const doc of m.values()) hydrateDoc(doc)
        result.set(key, m)
      }
      // Recover nextId based on the highest mock_ prefix found
      for (const col of result.values()) {
        for (const id of col.keys()) {
          const match = id.match(/^mock_(\d+)_/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num >= nextId) nextId = num + 1
          }
        }
      }
      return result
    }
  } catch (e) {
    console.error('Failed to load mock data from disk:', e)
  }
  return new Map()
}

function saveCollections(): void {
  try {
    ensureDir()
    const obj: Record<string, Record<string, Record<string, unknown>>> = {}
    for (const [key, col] of collections) {
      obj[key] = {}
      for (const [id, doc] of col) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { toJSON: _, ...clean } = doc as Record<string, unknown> & { toJSON?: unknown }
        obj[key][id] = clean
      }
    }
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(obj, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to persist mock data:', e)
  }
}

const collections = loadCollections()

function getCollection(name: string): Map<string, Record<string, unknown>> {
  if (!collections.has(name)) {
    collections.set(name, new Map())
  }
  return collections.get(name)!
}

function generateId(): string {
  return `mock_${nextId++}_${Date.now()}`
}

function matchesFilter(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(val)) {
      const orMatch = val.some((cond: Record<string, unknown>) => matchesFilter(doc, cond))
      if (!orMatch) return false
      continue
    }
    const docVal = doc[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const cond = val as Record<string, unknown>
      if ('$gt' in cond && !(docVal != null && (docVal as number) > (cond.$gt as number))) return false
      if ('$lt' in cond && !(docVal != null && (docVal as number) < (cond.$lt as number))) return false
      if ('$gte' in cond && !(docVal != null && (docVal as number) >= (cond.$gte as number))) return false
      if ('$lte' in cond && !(docVal != null && (docVal as number) <= (cond.$lte as number))) return false
      if ('$ne' in cond && docVal === cond.$ne) return false
      if ('$in' in cond && Array.isArray(cond.$in) && !cond.$in.includes(docVal)) return false
      if ('$nin' in cond && Array.isArray(cond.$nin) && cond.$nin.includes(docVal)) return false
      if ('$regex' in cond) {
        const regex = new RegExp(String(cond.$regex), String(cond.$options || ''))
        if (!regex.test(String(docVal || ''))) return false
      }
      continue
    }
    if (docVal !== val) return false
  }
  return true
}

function applySort(docs: Record<string, unknown>[], sort: Record<string, unknown>): void {
  const entries = Object.entries(sort)
  docs.sort((a, b) => {
    for (const [key, dir] of entries) {
      const aVal = a[key] as number
      const bVal = b[key] as number
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      if (cmp !== 0) return Number(dir) * cmp
    }
    return 0
  })
}

export function hasPersistedData(): boolean {
  return fs.existsSync(PERSIST_FILE) && collections.size > 0
}

export async function ensureAdminUser(): Promise<void> {
  if (!collections.has('User')) {
    collections.set('User', new Map())
  }
  const adminCol = collections.get('User')!
  let hasAdmin = false
  for (const doc of adminCol.values()) {
    if (doc.role === 'admin') { hasAdmin = true; break }
  }
  if (hasAdmin) return

  const hash = '$2a$10$/InbbN4oXSLDg9199oRkneAW9AZIURIvYK6Pfbzc0Lu4ljQ.RJVBm'
  const id = generateId()
  const doc: Record<string, unknown> = {
    _id: id, firstName: 'Abdulloh', lastName: 'Admin',
    phone: 'Abdulloh_1404', password: hash, role: 'admin', isActive: true, isVerified: true,
  }
  addToJSON(doc)
  adminCol.set(id, doc)
  saveCollections()
}

export function createMockModel(name: string) {
  const col = getCollection(name)
  const timestamps = true

  const persist = () => saveCollections()

  return {
    find(filter?: Record<string, unknown>): { sort(sortObj: Record<string, unknown>): { skip(n: number): { limit(n: number): Record<string, unknown>[] } } } & { toArray(): Record<string, unknown>[] } {
      let docs = [...col.values()]
      if (filter) {
        docs = docs.filter(d => matchesFilter(d, filter))
      }
      const cursor: any = {
        _docs: docs,
        sort(sortObj: Record<string, unknown>) {
          applySort(this._docs, sortObj)
          return this
        },
        skip(n: number) {
          this._docs = this._docs.slice(n)
          return this
        },
        limit(n: number) {
          this._docs = this._docs.slice(0, n)
          return this
        },
        toArray() {
          return [...this._docs]
        },
        then(resolve: (value: Record<string, unknown>[]) => void, reject?: (reason: unknown) => void) {
          try { resolve([...this._docs]) } catch (e) { if (reject) reject(e) }
        },
      }
      return cursor
    },

    async findOne(filter?: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      const docs = [...col.values()]
      const doc = (!filter ? docs[0] : docs.find(d => matchesFilter(d, filter))) || null
      if (doc) addToJSON(doc)
      return doc
    },

    async findById(id: string): Promise<Record<string, unknown> | null> {
      const doc = col.get(id) || null
      if (doc) addToJSON(doc)
      return doc
    },

    async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
      const id = generateId()
      const doc: Record<string, unknown> = {
        _id: id,
        ...data,
        createdAt: timestamps ? new Date().toISOString() : undefined,
        updatedAt: timestamps ? new Date().toISOString() : undefined,
      }
      addToJSON(doc)
      col.set(id, doc)
      persist()
      return doc
    },

    async countDocuments(filter?: Record<string, unknown>): Promise<number> {
      const docs = [...col.values()]
      if (!filter) return docs.length
      return docs.filter(d => matchesFilter(d, filter)).length
    },

    async findByIdAndUpdate(id: string, update: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      const existing = col.get(id)
      if (!existing) return null
      const setOp = (update.$set as Record<string, unknown>) || update
      const updated = { ...existing, ...setOp, updatedAt: timestamps ? new Date().toISOString() : undefined }
      addToJSON(updated)
      col.set(id, updated)
      persist()
      return updated
    },

    async findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      const docs = [...col.values()]
      const idx = docs.findIndex(d => matchesFilter(d, filter))
      if (idx === -1) return null
      const existing = docs[idx]
      const setOp = (update.$set as Record<string, unknown>) || update
      const updated = { ...existing, ...setOp, updatedAt: timestamps ? new Date().toISOString() : undefined }
      addToJSON(updated)
      col.set((updated as Record<string, unknown>)._id as string, updated)
      persist()
      return updated
    },

    async findByIdAndDelete(id: string): Promise<Record<string, unknown> | null> {
      const existing = col.get(id)
      if (!existing) return null
      col.delete(id)
      persist()
      return existing
    },

    async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount: number }> {
      let count = 0
      for (const [id, doc] of col.entries()) {
        if (matchesFilter(doc, filter)) {
          const setOp = (update.$set as Record<string, unknown>) || {}
          const updated = { ...doc, ...setOp, updatedAt: new Date().toISOString() }
          addToJSON(updated)
          col.set(id, updated)
          count++
        }
      }
      if (count > 0) persist()
      return { modifiedCount: count }
    },

    async deleteMany(): Promise<{ deletedCount: number }> {
      const count = col.size
      col.clear()
      persist()
      return { deletedCount: count }
    },
  }
}

export async function clearAllMockData(): Promise<void> {
  collections.clear()
  try {
    if (fs.existsSync(PERSIST_FILE)) fs.unlinkSync(PERSIST_FILE)
  } catch { /* ignore */ }
}
