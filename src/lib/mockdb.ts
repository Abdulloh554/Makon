let nextId = 1
const collections = new Map<string, Map<string, Record<string, unknown>>>()

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

export function createMockModel(name: string) {
  const col = getCollection(name)
  const timestamps = true

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
      if (!filter) return docs[0] || null
      return docs.find(d => matchesFilter(d, filter)) || null
    },

    async findById(id: string): Promise<Record<string, unknown> | null> {
      return col.get(id) || null
    },

    async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
      const id = generateId()
      const doc: Record<string, unknown> = {
        _id: id,
        ...data,
        createdAt: timestamps ? new Date().toISOString() : undefined,
        updatedAt: timestamps ? new Date().toISOString() : undefined,
      }
      col.set(id, doc)
      return { ...doc, toJSON: () => ({ ...doc, id }) }
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
      col.set(id, updated)
      return { ...updated, toJSON: () => ({ ...updated, id }) }
    },

    async findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      const docs = [...col.values()]
      const idx = docs.findIndex(d => matchesFilter(d, filter))
      if (idx === -1) return null
      const existing = docs[idx]
      const setOp = (update.$set as Record<string, unknown>) || update
      const updated = { ...existing, ...setOp, updatedAt: timestamps ? new Date().toISOString() : undefined }
      col.set((updated as Record<string, unknown>)._id as string, updated)
      return { ...updated, toJSON: () => ({ ...updated, id: (updated as Record<string, unknown>)._id }) }
    },

    async findByIdAndDelete(id: string): Promise<Record<string, unknown> | null> {
      const existing = col.get(id)
      if (!existing) return null
      col.delete(id)
      return existing
    },

    async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount: number }> {
      let count = 0
      for (const [id, doc] of col.entries()) {
        if (matchesFilter(doc, filter)) {
          const setOp = (update.$set as Record<string, unknown>) || {}
          col.set(id, { ...doc, ...setOp, updatedAt: new Date().toISOString() })
          count++
        }
      }
      return { modifiedCount: count }
    },

    async deleteMany(): Promise<{ deletedCount: number }> {
      const count = col.size
      col.clear()
      return { deletedCount: count }
    },
  }
}

export async function clearAllMockData(): Promise<void> {
  collections.clear()
}
