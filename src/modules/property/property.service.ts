import { propertyModel } from './property.model'
import { sellerModel } from '../seller/seller.model'
import { cache } from '../../utils/cache'
import { NotFoundError, ForbiddenError } from '../../errors/AppError'
import { saveImage as imageSave, UPLOADS_DIR } from '../image/image.service'
import * as fs from 'fs'
import * as path from 'path'

async function processImage(dataUri: string): Promise<string> {
  return imageSave(dataUri)
}

function extractImagePaths(property: Record<string, unknown>): string[] {
  const images = (property.images as string[]) ?? []
  const paths = images
    .filter((url: string) => url.startsWith('/api/uploads/'))
    .map((url: string) => path.basename(url))
  if (property.floorPlan && typeof property.floorPlan === 'object') {
    const fp = property.floorPlan as Record<string, unknown>
    if (Array.isArray(fp.floors)) {
      for (const floor of fp.floors as Record<string, unknown>[]) {
        if (typeof floor.image === 'string' && floor.image.startsWith('/api/uploads/')) {
          paths.push(path.basename(floor.image as string))
        }
        if (Array.isArray(floor.rooms)) {
          for (const room of floor.rooms as Record<string, unknown>[]) {
            if (typeof room.image === 'string' && room.image.startsWith('/api/uploads/')) {
              paths.push(path.basename(room.image as string))
            }
          }
        }
      }
    }
  }
  return paths
}

async function processFloorPlanImages(fp: Record<string, unknown>): Promise<Record<string, unknown>> {
  const floors: Record<string, unknown>[] = []
  if (Array.isArray(fp.floors)) {
    for (const floor of fp.floors as Record<string, unknown>[]) {
      const processedFloor: Record<string, unknown> = { ...floor }
      if (typeof floor.image === 'string' && floor.image.startsWith('data:')) {
        processedFloor.image = await processImage(floor.image as string)
      }
      if (Array.isArray(floor.rooms)) {
        processedFloor.rooms = await Promise.all(
          (floor.rooms as Record<string, unknown>[]).map(async (room) => {
            const processedRoom = { ...room }
            if (typeof room.image === 'string' && room.image.startsWith('data:')) {
              processedRoom.image = await processImage(room.image as string)
            }
            return processedRoom
          })
        )
      }
      floors.push(processedFloor)
    }
  }
  return { floors }
}

async function cleanupOrphanedImages(oldProperty: Record<string, unknown>, newProperty?: Record<string, unknown>): Promise<void> {
  const oldPaths = extractImagePaths(oldProperty)
  const newPaths = newProperty ? extractImagePaths(newProperty) : []
  const toRemove = oldPaths.filter(p => !newPaths.includes(p))
  for (const filename of toRemove) {
    const filepath = path.join(UPLOADS_DIR, filename)
    try {
      await fs.promises.unlink(filepath)
    } catch {
      // File already removed or not found
    }
  }
}

const CACHE_TTL = {
  PROPERTIES_LIST: 60,
  PROPERTY_DETAIL: 120,
} as const

const ALLOWED_SORT_FIELDS = ['createdAt', 'price', 'area', 'rooms']
const ALLOWED_SORT_ORDERS = ['asc', 'desc']

const VALID_DEAL_TYPES = ['daily', 'sale', 'rent', 'installment']
const VALID_PROPERTY_TYPES = ['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land']
const VALID_STATUSES = ['ready', 'half-ready', 'land', 'sold']

async function toJSON(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc
}

export async function list(filters: Record<string, unknown>) {
  const cacheKey = `properties:${JSON.stringify(filters)}`
  return cache.wrap(cacheKey, async () => {
    const filter: Record<string, unknown> = {}

    if (filters.dealType) {
      const dt = String(filters.dealType)
      if (VALID_DEAL_TYPES.includes(dt)) filter.dealType = dt
    }
    if (filters.propertyType) {
      const pt = String(filters.propertyType)
      if (VALID_PROPERTY_TYPES.includes(pt)) filter.type = pt
    }
    if (filters.status) {
      const st = String(filters.status)
      if (VALID_STATUSES.includes(st)) filter.status = st
    }
    if (filters.minPrice || filters.maxPrice) {
      filter.price = {}
      if (filters.minPrice) {
        const min = Number(filters.minPrice)
        if (!isNaN(min) && min >= 0) (filter.price as Record<string, unknown>).$gte = min
      }
      if (filters.maxPrice) {
        const max = Number(filters.maxPrice)
        if (!isNaN(max) && max >= 0) (filter.price as Record<string, unknown>).$lte = max
      }
    }
    if (filters.search) {
      const searchStr = String(filters.search).slice(0, 100)
      const escaped = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (escaped.length > 0) {
        filter.$or = [
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ]
      }
    }

    if (filters.sellerId) {
      filter.sellerId = String(filters.sellerId)
    }

    filter.isActive = true

    const page = Math.max(1, Number(filters.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20))
    const skip = (page - 1) * limit

    let sortField = 'createdAt'
    let sortOrder = 'desc'
    if (filters.sortBy && ALLOWED_SORT_FIELDS.includes(String(filters.sortBy))) {
      sortField = String(filters.sortBy)
    }
    if (filters.sortOrder && ALLOWED_SORT_ORDERS.includes(String(filters.sortOrder))) {
      sortOrder = String(filters.sortOrder)
    }

    const properties = await (propertyModel as any)
      .find(filter)
      .sort({ [sortField]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
    const total = await propertyModel.countDocuments(filter)

    return {
      data: await Promise.all(properties.map(toJSON)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }, CACHE_TTL.PROPERTIES_LIST)
}

export async function getById(id: string) {
  return cache.wrap(`property:${id}`, async () => {
    const property = await propertyModel.findById(id)
    if (!property) throw new NotFoundError('Property not found')
    return toJSON(property)
  }, CACHE_TTL.PROPERTY_DETAIL)
}

export async function create(data: Record<string, unknown>, userId: string) {
  const seller = await sellerModel.findOne({ userId })
  if (!seller) {
    throw new ForbiddenError('Siz sotuvchi emassiz. Avval sotuvchi sifatida ro\'yxatdan o\'ting.')
  }

  const sellerId = String(seller._id ?? seller.id ?? '')
  const cleanData = {
    sellerId,
    title: String(data.title || '').slice(0, 200),
    description: String(data.description || '').slice(0, 2000),
    price: Math.max(0, Number(data.price) || 0),
    type: VALID_PROPERTY_TYPES.includes(String(data.type)) ? String(data.type) : 'apartment',
    dealType: VALID_DEAL_TYPES.includes(String(data.dealType)) ? String(data.dealType) : 'sale',
    status: VALID_STATUSES.includes(String(data.status)) ? String(data.status) : 'ready',
    rooms: Math.max(0, Number(data.rooms) || 0),
    area: Math.max(0, Number(data.area) || 0),
    floor: data.floor !== undefined ? Math.max(0, Number(data.floor)) : undefined,
    totalFloors: data.totalFloors !== undefined ? Math.max(0, Number(data.totalFloors)) : undefined,
    installmentMonths: data.installmentMonths !== undefined ? Math.max(0, Number(data.installmentMonths)) : undefined,
    installmentPrice: data.installmentPrice !== undefined ? Math.max(0, Number(data.installmentPrice)) : undefined,
    location: {
      lat: Number((data.location as Record<string, unknown>)?.lat) || 0,
      lng: Number((data.location as Record<string, unknown>)?.lng) || 0,
      address: String((data.location as Record<string, unknown>)?.address || '').slice(0, 500),
    },
    images: await Promise.all(
      (Array.isArray(data.images)
        ? (data.images as unknown[]).slice(0, 20).map(String)
        : typeof data.images === 'string'
          ? [data.images as string]
          : []
      ).map(processImage)
    ),
    floorPlan: data.floorPlan && typeof data.floorPlan === 'object'
      ? await processFloorPlanImages(data.floorPlan as Record<string, unknown>)
      : undefined,
    isActive: true,
  }

  const property = await propertyModel.create(cleanData)
  await sellerModel.findByIdAndUpdate(sellerId, { $inc: { totalListings: 1 } })
  await cache.delPattern('properties:*')
  return toJSON(property)
}

export async function update(id: string, data: Record<string, unknown>, userId: string) {
  const property = await propertyModel.findById(id)
  if (!property) throw new NotFoundError('Property not found')

  const seller = await sellerModel.findOne({ userId })
  const propertySellerId = String(property.sellerId ?? '')
  const sellerId = String(seller?._id ?? seller?.id ?? '')
  if (!seller || (propertySellerId !== sellerId)) {
    throw new ForbiddenError('Siz faqat o\'z elonlaringizni tahrirlashingiz mumkin.')
  }

  const allowedFields = ['title', 'description', 'price', 'type', 'dealType', 'status', 'rooms', 'area', 'floor', 'totalFloors', 'installmentMonths', 'installmentPrice', 'location', 'images', 'floorPlan']
  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      if (key === 'images') {
        const raw = data[key]
        updateData[key] = await Promise.all(
          (Array.isArray(raw) ? (raw as unknown[]).map(String) : typeof raw === 'string' ? [raw as string] : []).map(processImage)
        )
      } else if (key === 'floorPlan' && data[key] && typeof data[key] === 'object') {
        updateData[key] = await processFloorPlanImages(data[key] as Record<string, unknown>)
      } else {
        updateData[key] = data[key]
      }
    }
  }

  const oldProperty = property.toJSON ? property.toJSON() : { ...property } as Record<string, unknown>
  Object.assign(property, updateData)
  await property.save()
  await cleanupOrphanedImages(oldProperty, updateData)
  await cache.delPattern('properties:*')
  await cache.del(`property:${id}`)
  return toJSON(property)
}

export async function toggleFavorite(id: string, userId: string): Promise<Record<string, unknown>> {
  const property = await propertyModel.findById(id)
  if (!property) throw new NotFoundError('Property not found')

  const propertyJson = property.toJSON ? property.toJSON() : property
  const favorites: string[] = propertyJson.favorites ?? []

  const index = favorites.indexOf(userId)
  let isFavorite: boolean
  if (index === -1) {
    favorites.push(userId)
    isFavorite = true
  } else {
    favorites.splice(index, 1)
    isFavorite = false
  }

  await propertyModel.findByIdAndUpdate(id, { favorites })
  await cache.del(`property:${id}`)

  return { isFavorite }
}

export async function deleteProperty(id: string, userId: string) {
  const property = await propertyModel.findById(id)
  if (!property) throw new NotFoundError('Property not found')

  const seller = await sellerModel.findOne({ userId })
  const propertySellerId = String(property.sellerId ?? '')
  const sellerId = String(seller?._id ?? seller?.id ?? '')
  if (!seller || (propertySellerId !== sellerId)) {
    throw new ForbiddenError('Siz faqat o\'z elonlaringizni o\'chirishingiz mumkin.')
  }

  const propertyData = property.toJSON ? property.toJSON() : property
  await cleanupOrphanedImages(propertyData as Record<string, unknown>)
  await propertyModel.findByIdAndDelete(id)
  await sellerModel.findByIdAndUpdate(sellerId, { $inc: { totalListings: -1 } })
  await cache.delPattern('properties:*')
  await cache.del(`property:${id}`)
  return { message: 'Elon o\'chirildi.' }
}
