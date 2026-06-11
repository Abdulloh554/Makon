const mongoose = require('mongoose');

let idCounter = 1;
function newId() { return String(idCounter++); }

class MemCollection {
  constructor() {
    this._data = [];
  }

  _match(doc, filter) {
    for (const key of Object.keys(filter)) {
      if (key === '$or') {
        if (!filter.$or.some((cond) => this._match(doc, cond))) return false;
        continue;
      }
      if (key === '$and') {
        if (!filter.$and.every((cond) => this._match(doc, cond))) return false;
        continue;
      }
      const val = filter[key];
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        if (val.$gte !== undefined || val.$lte !== undefined) {
          const d = Number(doc[key]);
          if (val.$gte !== undefined && d < val.$gte) return false;
          if (val.$lte !== undefined && d > val.$lte) return false;
          continue;
        }
        if (val.$regex) {
          const re = new RegExp(val.$regex, val.$options || 'i');
          if (!re.test(String(doc[key] || ''))) return false;
          continue;
        }
        if (val.$ne !== undefined && String(doc[key]) === String(val.$ne)) return false;
        if (val.$in && !val.$in.includes(doc[key])) return false;
        continue;
      }
      if (String(doc[key] ?? '') !== String(val)) return false;
    }
    return true;
  }

  _wrap(data) {
    const doc = { ...data };
    const self = this;
    return {
      ...doc,
      toJSON() {
        const ret = {};
        for (const k of Object.keys(doc)) {
          if (k === 'toJSON' || k === 'save' || k === 'populate') continue;
          ret[k] = doc[k];
        }
        ret.id = String(doc._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
      save() {
        const idx = self._data.findIndex((d) => String(d._id) === String(doc._id));
        if (idx !== -1) {
          self._data[idx] = { ...self._data[idx], ...doc, updatedAt: new Date().toISOString() };
        }
      },
      populate() { return Promise.resolve(this); },
    };
  }

  // Returns chainable cursor
  find(filter = {}) {
    const results = this._data.filter((d) => this._match(d, filter));
    return new Query(results, (arr) => arr.map((d) => this._wrap(d)));
  }

  findOne(filter = {}) {
    const d = this._data.find((e) => this._match(e, filter));
    return Promise.resolve(d ? this._wrap(d) : null);
  }

  findById(id) {
    const d = this._data.find((e) => String(e._id) === String(id));
    return Promise.resolve(d ? this._wrap(d) : null);
  }

  create(data) {
    const doc = {
      _id: newId(),
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this._data.push(doc);
    return Promise.resolve(this._wrap(doc));
  }

  countDocuments(filter = {}) {
    return Promise.resolve(this._data.filter((d) => this._match(d, filter)).length);
  }

  findOneAndUpdate(filter, update) {
    const idx = this._data.findIndex((d) => this._match(d, filter));
    if (idx === -1) return Promise.resolve(null);
    if (update.$set) Object.assign(this._data[idx], update.$set);
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        this._data[idx][k] = (this._data[idx][k] || 0) + v;
      }
    }
    this._data[idx].updatedAt = new Date().toISOString();
    return Promise.resolve(this._wrap(this._data[idx]));
  }

  findByIdAndDelete(id) {
    const idx = this._data.findIndex((d) => String(d._id) === String(id));
    if (idx === -1) return Promise.resolve(null);
    const deleted = this._data.splice(idx, 1)[0];
    return Promise.resolve(this._wrap(deleted));
  }
}

// Chainable query cursor
class Query {
  constructor(data, wrapFn) {
    this._data = Array.isArray(data) ? data : [];
    this._wrapFn = wrapFn;
    this._sortObj = null;
    this._skipVal = 0;
    this._limitVal = null;
  }

  _clone() {
    const q = new Query(this._data, this._wrapFn);
    q._sortObj = this._sortObj;
    q._skipVal = this._skipVal;
    q._limitVal = this._limitVal;
    return q;
  }

  sort(obj) {
    const q = this._clone();
    q._sortObj = obj;
    return q;
  }

  skip(n) {
    const q = this._clone();
    q._skipVal = n || 0;
    return q;
  }

  limit(n) {
    const q = this._clone();
    q._limitVal = n || null;
    return q;
  }

  populate() { return this; }

  then(resolve, reject) {
    try {
      const src = Array.isArray(this._data) ? this._data : [];
      let arr = [...src];

      if (this._sortObj) {
        const key = Object.keys(this._sortObj)[0];
        const dir = this._sortObj[key] === -1 ? -1 : 1;
        arr.sort((a, b) => {
          const va = a[key], vb = b[key];
          if (dir === -1) return new Date(vb) - new Date(va);
          return new Date(va) - new Date(vb);
        });
      }

      if (this._skipVal > 0) arr = arr.slice(this._skipVal);
      if (this._limitVal != null) arr = arr.slice(0, this._limitVal);

      resolve(this._wrapFn(arr));
    } catch (e) {
      reject(e);
    }
  }

  // Make await-able
  [Symbol.toStringTag]() { return 'Query'; }
}

const memCollections = {};
const schemas = {};
const mongooseModels = {};

function getMemCollection(name) {
  if (!memCollections[name]) memCollections[name] = new MemCollection();
  return memCollections[name];
}

function defineMongooseModel(name, schemaDef) {
  if (mongooseModels[name]) return;

  const schema = new mongoose.Schema(schemaDef, { timestamps: true });
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });

  mongooseModels[name] = mongoose.model(name, schema);
}

function usingMemory() {
  return process.env.USE_MONGO !== 'true' || mongoose.connection.readyState !== 1;
}

function createModel(name, schemaDef) {
  schemas[name] = schemaDef;

  if (!usingMemory()) {
    defineMongooseModel(name, schemaDef);
    return mongooseModels[name];
  }

  const col = getMemCollection(name);
  return {
    find(filter = {}) { return col.find(filter); },
    findOne(filter = {}) { return col.findOne(filter); },
    findById(id) { return col.findById(id); },
    create(data) { return col.create(data); },
    countDocuments(filter = {}) { return col.countDocuments(filter); },
    findByIdAndUpdate(id, update) { return col.findOneAndUpdate({ _id: id }, update); },
    findOneAndUpdate(filter, update) { return col.findOneAndUpdate(filter, update); },
    findByIdAndDelete(id) { return col.findByIdAndDelete(id); },
  };
}

function switchToMongoose() {
  for (const [name, schemaDef] of Object.entries(schemas)) {
    defineMongooseModel(name, schemaDef);
  }
}

function clearAllData() {
  for (const key of Object.keys(memCollections)) {
    memCollections[key]._data = [];
  }
  if (!usingMemory()) {
    for (const name of Object.keys(mongooseModels)) {
      mongooseModels[name].deleteMany({}).catch(() => {});
    }
  }
}

module.exports = { createModel, switchToMongoose, clearAllData };
